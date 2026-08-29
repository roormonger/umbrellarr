import type {
  ArrKind,
  Instance,
  InstanceCreateRequest,
  InstanceUpdateRequest,
} from "@umbrellarr/shared";
import { ArrKindSchema, InstanceSchema } from "@umbrellarr/shared";
import { eq } from "drizzle-orm";
import { decryptSecret, encryptSecret, parseSecretsKey, type SealedSecret } from "../crypto/secrets.js";
import type { AppDatabase } from "../db/client.js";
import { instancesTable, metaTable } from "../db/schema.js";
import { makeInstanceId } from "./instanceIds.js";
import { loadInstancesFromEnv } from "./instances.js";

const META_ENV_IMPORTED = "env_instances_imported_at";

export type InstanceStoreOptions = {
  db: AppDatabase;
  secretsKey: string;
  onChange?: (instances: Instance[]) => void;
};

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export class InstanceStore {
  private readonly db: AppDatabase;
  private readonly key: Buffer;
  private readonly onChange?: (instances: Instance[]) => void;
  private cache: Instance[] = [];

  constructor(options: InstanceStoreOptions) {
    this.db = options.db;
    this.key = parseSecretsKey(options.secretsKey);
    this.onChange = options.onChange;
  }

  /** Load from DB; if empty, import env Arr clients once. */
  bootstrapFromEnvIfEmpty(env: NodeJS.ProcessEnv = process.env): Instance[] {
    this.reload();
    if (this.cache.length > 0) return this.cache;

    const fromEnv = loadInstancesFromEnv(env);
    if (fromEnv.length === 0) {
      console.log("[instances] no SQLite rows and no env Arr clients to import");
      return this.cache;
    }

    const now = new Date();
    for (const instance of fromEnv) {
      const sealed = encryptSecret(this.key, instance.apiKey ?? "");
      this.db.insert(instancesTable).values({
        id: instance.id,
        name: instance.name,
        kind: instance.kind,
        baseUrl: normalizeBaseUrl(instance.baseUrl),
        apiKeyCiphertext: sealed.ciphertext,
        apiKeyIv: sealed.iv,
        apiKeyTag: sealed.tag,
        createdAt: now,
        updatedAt: now,
      }).run();
    }

    this.db
      .insert(metaTable)
      .values({ key: META_ENV_IMPORTED, value: now.toISOString() })
      .onConflictDoUpdate({
        target: metaTable.key,
        set: { value: now.toISOString() },
      })
      .run();

    console.log(
      `[instances] imported ${fromEnv.length} client(s) from environment into SQLite: ${fromEnv
        .map((i) => i.id)
        .join(", ")}`,
    );
    return this.reload();
  }

  reload(): Instance[] {
    const rows = this.db.select().from(instancesTable).all();
    this.cache = rows.map((row) => this.rowToInstance(row));
    return this.cache;
  }

  list(): Instance[] {
    return this.cache;
  }

  listByKind(kind: ArrKind): Instance[] {
    return this.cache.filter((i) => i.kind === kind);
  }

  get(id: string): Instance | undefined {
    return this.cache.find((i) => i.id === id);
  }

  create(input: InstanceCreateRequest): Instance {
    const kind = ArrKindSchema.parse(input.kind);
    const name = input.name.trim();
    const baseUrl = normalizeBaseUrl(input.baseUrl);
    const apiKey = input.apiKey.trim();
    this.assertUniqueUrl(kind, baseUrl);

    const taken = new Set(this.cache.map((i) => i.id));
    const id = makeInstanceId(kind, name, taken);
    const sealed = encryptSecret(this.key, apiKey);
    const now = new Date();

    const instance = InstanceSchema.parse({
      id,
      name,
      kind,
      baseUrl,
      apiKey,
    });

    this.db.insert(instancesTable).values({
      id,
      name,
      kind,
      baseUrl,
      apiKeyCiphertext: sealed.ciphertext,
      apiKeyIv: sealed.iv,
      apiKeyTag: sealed.tag,
      createdAt: now,
      updatedAt: now,
    }).run();

    this.reload();
    this.emitChange();
    return instance;
  }

  update(id: string, input: InstanceUpdateRequest): Instance {
    const existing = this.get(id);
    if (!existing) {
      throw new Error(`Instance ${id} not found`);
    }

    const kind = ArrKindSchema.parse(input.kind);
    const name = input.name.trim();
    const baseUrl = normalizeBaseUrl(input.baseUrl);
    this.assertUniqueUrl(kind, baseUrl, id);

    const apiKey = input.apiKey?.trim() ? input.apiKey.trim() : existing.apiKey;
    if (!apiKey) {
      throw new Error("API key is required");
    }

    const sealed = encryptSecret(this.key, apiKey);
    const now = new Date();

    this.db
      .update(instancesTable)
      .set({
        name,
        kind,
        baseUrl,
        apiKeyCiphertext: sealed.ciphertext,
        apiKeyIv: sealed.iv,
        apiKeyTag: sealed.tag,
        updatedAt: now,
      })
      .where(eq(instancesTable.id, id))
      .run();

    this.reload();
    this.emitChange();
    const updated = this.get(id);
    if (!updated) throw new Error(`Instance ${id} missing after update`);
    return updated;
  }

  remove(id: string): void {
    const existing = this.get(id);
    if (!existing) {
      throw new Error(`Instance ${id} not found`);
    }
    this.db.delete(instancesTable).where(eq(instancesTable.id, id)).run();
    this.reload();
    this.emitChange();
  }

  private assertUniqueUrl(kind: ArrKind, baseUrl: string, exceptId?: string) {
    const clash = this.cache.find(
      (i) => i.kind === kind && i.baseUrl === baseUrl && i.id !== exceptId,
    );
    if (clash) {
      throw new Error(`A ${kind} client already uses ${baseUrl} (${clash.name})`);
    }
  }

  private rowToInstance(row: typeof instancesTable.$inferSelect): Instance {
    const sealed: SealedSecret = {
      ciphertext: row.apiKeyCiphertext,
      iv: row.apiKeyIv,
      tag: row.apiKeyTag,
    };
    let apiKey: string;
    try {
      apiKey = decryptSecret(this.key, sealed);
    } catch {
      throw new Error(
        `Failed to decrypt API key for instance "${row.id}". Check INSTANCE_SECRETS_KEY matches the key used when the DB was written.`,
      );
    }
    const kind = ArrKindSchema.parse(row.kind);
    return InstanceSchema.parse({
      id: row.id,
      name: row.name,
      kind,
      baseUrl: row.baseUrl,
      apiKey,
    });
  }

  private emitChange() {
    this.onChange?.(this.cache);
  }
}
