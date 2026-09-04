import type {
  IndexerCreateRequest,
  IndexerEditDetail,
  IndexerEditOptions,
  IndexerField,
  IndexerFieldPrivacy,
  IndexerListItem,
  IndexerPrivacy,
  IndexerProtocol,
  IndexerSchemaCategoriesResponse,
  IndexerSchemaCategory,
  IndexerSchemaItem,
  IndexerSchemaListResponse,
  IndexerSchemaTemplate,
  IndexerSelectOption,
  IndexerStatusKind,
  IndexerUpdateRequest,
  Instance,
  UnifiedIndexerResponse,
} from "@umbrellarr/shared";
import { INDEXER_SECRET_SENTINEL } from "@umbrellarr/shared";
import { arrFetch, arrJson } from "./client.js";
import { activityListCache } from "../cache/ttlCache.js";

type ProwlarrField = {
  name?: string;
  label?: string;
  helpText?: string;
  helpTextWarning?: string;
  helpLink?: string;
  value?: unknown;
  type?: string;
  advanced?: boolean;
  hidden?: string;
  privacy?: string;
  placeholder?: string;
  selectOptions?: unknown;
  selectOptionsProviderAction?: string;
  isFloat?: boolean;
  section?: string;
};

type ProwlarrCategory = {
  id?: number;
  name?: string;
  subCategories?: ProwlarrCategory[];
};

type ProwlarrIndexerStatus = {
  disabledTill?: string;
  initialFailure?: string;
  mostRecentFailure?: string;
};

type ProwlarrIndexer = {
  id?: number;
  name?: string;
  enable?: boolean;
  redirect?: boolean;
  priority?: number;
  added?: string;
  protocol?: string | number;
  privacy?: string;
  language?: string;
  description?: string;
  appProfileId?: number;
  downloadClientId?: number;
  tags?: number[];
  implementation?: string;
  implementationName?: string;
  definitionName?: string;
  configContract?: string;
  supportsRedirect?: boolean;
  supportsRss?: boolean;
  indexerUrls?: string[];
  fields?: ProwlarrField[];
  capabilities?: { categories?: ProwlarrCategory[] };
  status?: ProwlarrIndexerStatus | null;
};

type ProwlarrIndexerResource = ProwlarrIndexer & Record<string, unknown>;

type ProwlarrAppProfile = {
  id?: number;
  name?: string;
};

type ProwlarrTag = { id?: number; label?: string };
type ProwlarrDownloadClient = {
  id?: number;
  name?: string;
  protocol?: string | number;
  enable?: boolean;
};

function requireProwlarrInstance(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId && i.kind === "prowlarr");
  if (!instance) {
    throw new Error(`Prowlarr instance not found: ${instanceId}`);
  }
  return instance;
}

function parseProtocol(value: string | number | undefined): IndexerProtocol {
  if (typeof value === "number") {
    if (value === 1) return "usenet";
    return "torrent";
  }
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "usenet") return "usenet";
  return "torrent";
}

function parsePrivacy(value: string | undefined): IndexerPrivacy {
  const normalized = (value ?? "").replace(/[-_\s]/g, "").toLowerCase();
  if (normalized === "private") return "private";
  if (normalized === "semiprivate") return "semiPrivate";
  return "public";
}

function statusKind(
  enable: boolean,
  redirect: boolean,
  status: ProwlarrIndexerStatus | null | undefined,
): IndexerStatusKind {
  if (status) return "error";
  if (!enable) return "disabled";
  if (redirect) return "enabledRedirected";
  return "enabled";
}

function httpUrlFromUnknown(value: unknown): string | undefined {
  if (typeof value === "string") {
    for (const part of value.split(/[\s,]+/)) {
      const trimmed = part.trim();
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
    }
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = httpUrlFromUnknown(item);
      if (found) return found;
    }
  }
  return undefined;
}

function websiteUrlFor(indexer: ProwlarrIndexer): string | undefined {
  const baseUrlField = indexer.fields?.find((field) => field.name === "baseUrl");
  return httpUrlFromUnknown(baseUrlField?.value) ?? httpUrlFromUnknown(indexer.indexerUrls);
}

function categoryNames(indexer: ProwlarrIndexer): string[] {
  const cats = indexer.capabilities?.categories ?? [];
  const seen = new Set<number>();
  const names: Array<{ id: number; name: string }> = [];
  for (const cat of cats) {
    if (cat.id == null || cat.id >= 100000) continue;
    if (seen.has(cat.id)) continue;
    seen.add(cat.id);
    const name = cat.name?.trim();
    if (!name) continue;
    names.push({ id: cat.id, name });
  }
  names.sort((a, b) => a.id - b.id);
  return names.map((c) => c.name);
}

function mapIndexer(
  instance: Instance,
  indexer: ProwlarrIndexer,
  profiles: Map<number, string>,
): IndexerListItem | null {
  if (indexer.id == null) return null;
  const enable = indexer.enable === true;
  const redirect = indexer.redirect === true;
  const appProfileId = indexer.appProfileId ?? 0;
  return {
    id: indexer.id,
    instanceId: instance.id,
    instanceName: instance.name,
    name: indexer.name?.trim() || `Indexer ${indexer.id}`,
    enable,
    redirect,
    statusKind: statusKind(enable, redirect, indexer.status),
    protocol: parseProtocol(indexer.protocol),
    privacy: parsePrivacy(indexer.privacy),
    priority: Number.isFinite(indexer.priority) ? Number(indexer.priority) : 25,
    appProfileId,
    syncProfile: profiles.get(appProfileId) ?? "",
    added: indexer.added,
    categories: categoryNames(indexer),
    websiteUrl: websiteUrlFor(indexer),
  };
}

async function fetchAppProfiles(instance: Instance): Promise<Map<number, string>> {
  const profiles = await arrJson<ProwlarrAppProfile[]>(instance, "/api/v1/appprofile");
  const map = new Map<number, string>();
  for (const profile of Array.isArray(profiles) ? profiles : []) {
    if (profile.id == null) continue;
    map.set(profile.id, profile.name?.trim() || `Profile ${profile.id}`);
  }
  return map;
}

export async function fetchIndexerList(
  instances: Instance[],
  instanceId: string,
): Promise<IndexerListItem[]> {
  const instance = requireProwlarrInstance(instances, instanceId);
  const [indexers, profiles] = await Promise.all([
    arrJson<ProwlarrIndexer[]>(instance, "/api/v1/indexer", { timeoutMs: 30_000 }),
    fetchAppProfiles(instance).catch(() => new Map<number, string>()),
  ]);
  const items: IndexerListItem[] = [];
  for (const indexer of Array.isArray(indexers) ? indexers : []) {
    const mapped = mapIndexer(instance, indexer, profiles);
    if (mapped) items.push(mapped);
  }
  return items;
}

export async function fetchUnifiedIndexers(
  instances: Instance[],
  instanceId?: string,
): Promise<UnifiedIndexerResponse> {
  const prowlarrInstances = instances.filter((i) => i.kind === "prowlarr");
  const targets = instanceId
    ? prowlarrInstances.filter((i) => i.id === instanceId)
    : prowlarrInstances;

  if (instanceId && targets.length === 0) {
    throw new Error(`Prowlarr instance not found: ${instanceId}`);
  }

  const settled = await Promise.allSettled(targets.map((instance) => fetchIndexerList(instances, instance.id)));

  const items: IndexerListItem[] = [];
  const errors: UnifiedIndexerResponse["errors"] = [];

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]!;
    const instance = targets[i]!;
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      const message =
        result.reason instanceof Error ? result.reason.message : "Indexer fetch failed";
      errors.push({
        instanceId: instance.id,
        instanceName: instance.name,
        message,
      });
    }
  }

  items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return { items, errors };
}

export async function fetchIndexerRss(
  instances: Instance[],
  instanceId: string,
  indexerId: number,
): Promise<Response> {
  const instance = requireProwlarrInstance(instances, instanceId);
  const key = instance.apiKey ?? "";
  const path = `/${indexerId}/api?apikey=${encodeURIComponent(key)}&extended=1&t=search`;
  const res = await arrFetch(instance, path, {
    timeoutMs: 30_000,
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {
      // ignore
    }
    throw new Error(
      `${instance.name} GET ${path.split("?")[0]} RSS failed: HTTP ${res.status}${detail ? ` ${detail}` : ""}`,
    );
  }
  return res;
}

export class IndexerUpstreamError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const SECRET_FIELD_NAME = /^(api[_-]?key|rss[_-]?key|password|passkey|cookie|captcha)$/i;

function isSecretField(field: { name?: string; type?: string; privacy?: string }): boolean {
  const privacy = (field.privacy ?? "").toLowerCase();
  if (privacy === "apikey" || privacy === "password") return true;
  if ((field.type ?? "").toLowerCase() === "password") return true;
  return SECRET_FIELD_NAME.test(field.name ?? "");
}

function hasSecretValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.length > 0 && value !== INDEXER_SECRET_SENTINEL;
  return true;
}

function extractProwlarrMessages(text: string): string {
  try {
    const parsed: unknown = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const messages: string[] = [];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      for (const key of ["errorMessage", "message", "error"] as const) {
        const value = rec[key];
        if (typeof value === "string" && value.trim()) {
          messages.push(value.trim());
          break;
        }
      }
    }
    if (messages.length > 0) return messages.join("; ").slice(0, 400);
  } catch {
    // ignore non-JSON
  }
  return "";
}

async function indexerJson<T>(
  instance: Instance,
  path: string,
  options?: { timeoutMs?: number; method?: string; body?: unknown },
): Promise<T> {
  const { timeoutMs, method, body } = options ?? {};
  const res = await arrFetch(instance, path, {
    timeoutMs,
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const summary = extractProwlarrMessages(text);
    const safePath = path.split("?")[0] ?? path;
    throw new IndexerUpstreamError(
      res.status,
      `${instance.name} ${method ?? "GET"} ${safePath} failed: HTTP ${res.status}${summary ? ` ${summary}` : ""}`,
    );
  }
  if (res.status === 204 || !text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new IndexerUpstreamError(
      502,
      `${instance.name} ${method ?? "GET"} ${path.split("?")[0]} returned invalid JSON`,
    );
  }
}

function mapFieldPrivacy(value: string | undefined): IndexerFieldPrivacy | undefined {
  if (value === "normal" || value === "password" || value === "apiKey" || value === "userName") {
    return value;
  }
  return undefined;
}

function mapSelectOptions(raw: unknown): IndexerSelectOption[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const options: IndexerSelectOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as { value?: unknown; name?: unknown; hint?: unknown; order?: unknown };
    if (typeof rec.value !== "string" && typeof rec.value !== "number") continue;
    const name = typeof rec.name === "string" ? rec.name : String(rec.value);
    options.push({
      value: rec.value,
      name,
      hint: typeof rec.hint === "string" ? rec.hint : undefined,
      order: typeof rec.order === "number" ? rec.order : undefined,
    });
  }
  return options.length > 0 ? options : undefined;
}

function mapField(raw: ProwlarrField): IndexerField | null {
  if (!raw.name) return null;
  const field: IndexerField = {
    name: raw.name,
    label: raw.label?.trim() || raw.name,
    type: raw.type?.trim() || "textbox",
    advanced: raw.advanced === true,
    value: raw.value,
  };
  if (raw.helpText) field.helpText = raw.helpText;
  if (raw.helpTextWarning) field.helpTextWarning = raw.helpTextWarning;
  if (raw.helpLink) field.helpLink = raw.helpLink;
  if (raw.hidden) field.hidden = raw.hidden;
  const privacy = mapFieldPrivacy(raw.privacy);
  if (privacy) field.privacy = privacy;
  if (raw.placeholder) field.placeholder = raw.placeholder;
  const selectOptions = mapSelectOptions(raw.selectOptions);
  if (selectOptions) field.selectOptions = selectOptions;
  if (raw.selectOptionsProviderAction) field.selectOptionsProviderAction = raw.selectOptionsProviderAction;
  if (raw.isFloat) field.isFloat = true;
  if (raw.section) field.section = raw.section;
  return field;
}

function maskEditFields(fields: IndexerField[]): IndexerField[] {
  return fields.map((field) => {
    if (!isSecretField(field) || !hasSecretValue(field.value)) return field;
    return { ...field, value: INDEXER_SECRET_SENTINEL };
  });
}

async function attachGetUrls(
  instance: Instance,
  raw: ProwlarrIndexerResource,
  fields: IndexerField[],
): Promise<void> {
  if (!fields.some((field) => field.selectOptionsProviderAction === "getUrls")) return;
  try {
    const result = await indexerJson<{ options?: unknown }>(instance, "/api/v1/indexer/action/getUrls", {
      method: "POST",
      body: raw,
      timeoutMs: 15_000,
    });
    const options = mapSelectOptions(result?.options);
    if (!options) return;
    for (const field of fields) {
      if (field.selectOptionsProviderAction === "getUrls") {
        field.selectOptions = options;
      }
    }
  } catch {
    // Current value still works as a Select option in the UI.
  }
}

async function fetchRawIndexer(instance: Instance, indexerId: number): Promise<ProwlarrIndexerResource> {
  const raw = await indexerJson<ProwlarrIndexerResource>(instance, `/api/v1/indexer/${indexerId}`, {
    timeoutMs: 30_000,
  });
  if (!raw || typeof raw !== "object" || raw.id == null) {
    throw new IndexerUpstreamError(404, `Indexer ${indexerId} not found`);
  }
  return raw;
}

function mapEditDetail(
  instance: Instance,
  raw: ProwlarrIndexerResource,
  fields: IndexerField[],
): IndexerEditDetail {
  return {
    id: raw.id!,
    instanceId: instance.id,
    name: raw.name?.trim() || `Indexer ${raw.id}`,
    enable: raw.enable === true,
    redirect: raw.redirect === true,
    appProfileId: raw.appProfileId ?? 0,
    priority: Number.isFinite(raw.priority) ? Number(raw.priority) : 25,
    downloadClientId: Number.isFinite(raw.downloadClientId) ? Number(raw.downloadClientId) : 0,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((id): id is number => Number.isFinite(id)) : [],
    protocol: parseProtocol(raw.protocol),
    implementationName: raw.implementationName?.trim() || raw.implementation?.trim() || "Indexer",
    supportsRedirect: raw.supportsRedirect === true,
    supportsRss: raw.supportsRss !== false,
    fields,
  };
}

export async function fetchIndexerEditDetail(
  instances: Instance[],
  instanceId: string,
  indexerId: number,
): Promise<IndexerEditDetail> {
  const instance = requireProwlarrInstance(instances, instanceId);
  const raw = await fetchRawIndexer(instance, indexerId);
  const fields = (Array.isArray(raw.fields) ? raw.fields : [])
    .map((field) => mapField(field))
    .filter((field): field is IndexerField => field != null);
  await attachGetUrls(instance, raw, fields);
  return mapEditDetail(instance, raw, maskEditFields(fields));
}

export async function fetchIndexerEditOptions(
  instances: Instance[],
  instanceId: string,
): Promise<IndexerEditOptions> {
  const instance = requireProwlarrInstance(instances, instanceId);
  const [profiles, tags, clients] = await Promise.all([
    indexerJson<ProwlarrAppProfile[]>(instance, "/api/v1/appprofile").catch(() => []),
    indexerJson<ProwlarrTag[]>(instance, "/api/v1/tag").catch(() => []),
    indexerJson<ProwlarrDownloadClient[]>(instance, "/api/v1/downloadclient").catch(() => []),
  ]);
  return {
    appProfiles: (Array.isArray(profiles) ? profiles : [])
      .filter((p): p is ProwlarrAppProfile & { id: number } => p.id != null)
      .map((p) => ({ id: p.id, name: p.name?.trim() || `Profile ${p.id}` })),
    tags: (Array.isArray(tags) ? tags : [])
      .filter((t): t is ProwlarrTag & { id: number } => t.id != null)
      .map((t) => ({ id: t.id, label: t.label?.trim() || `Tag ${t.id}` })),
    downloadClients: (Array.isArray(clients) ? clients : [])
      .filter((c): c is ProwlarrDownloadClient & { id: number } => c.id != null)
      .map((c) => ({
        id: c.id,
        name: c.name?.trim() || `Client ${c.id}`,
        protocol: typeof c.protocol === "string" ? c.protocol : undefined,
      })),
  };
}

function mergeSecretValue(clientValue: unknown, liveValue: unknown): unknown {
  if (clientValue === INDEXER_SECRET_SENTINEL) return liveValue;
  return clientValue;
}

function mergeIndexerResource(
  live: ProwlarrIndexerResource,
  patch: IndexerUpdateRequest,
): ProwlarrIndexerResource {
  const clientByName = new Map(patch.fields.map((field) => [field.name, field.value]));
  const liveFields = Array.isArray(live.fields) ? live.fields : [];
  const fields = liveFields.map((field) => {
    if (!field.name || !clientByName.has(field.name)) return field;
    const clientValue = clientByName.get(field.name);
    const value = isSecretField(field) ? mergeSecretValue(clientValue, field.value) : clientValue;
    return { ...field, value };
  });
  return {
    ...live,
    name: patch.name,
    enable: patch.enable,
    redirect: patch.redirect,
    appProfileId: patch.appProfileId,
    priority: patch.priority,
    downloadClientId: patch.downloadClientId,
    tags: patch.tags,
    fields,
  };
}

export async function updateIndexer(
  instances: Instance[],
  instanceId: string,
  indexerId: number,
  patch: IndexerUpdateRequest,
  forceSave = false,
): Promise<void> {
  const instance = requireProwlarrInstance(instances, instanceId);
  const live = await fetchRawIndexer(instance, indexerId);
  const merged = mergeIndexerResource(live, patch);
  const suffix = forceSave ? "?forceSave=true" : "";
  await indexerJson(instance, `/api/v1/indexer/${indexerId}${suffix}`, {
    method: "PUT",
    body: merged,
    timeoutMs: 30_000,
  });
}

export async function testIndexer(
  instances: Instance[],
  instanceId: string,
  indexerId: number,
  patch: IndexerUpdateRequest,
  forceTest = false,
): Promise<void> {
  const instance = requireProwlarrInstance(instances, instanceId);
  const live = await fetchRawIndexer(instance, indexerId);
  const merged = mergeIndexerResource(live, patch);
  const suffix = forceTest ? "?forceTest=true" : "";
  await indexerJson(instance, `/api/v1/indexer/test${suffix}`, {
    method: "POST",
    body: merged,
    timeoutMs: 30_000,
  });
}

export async function deleteIndexer(
  instances: Instance[],
  instanceId: string,
  indexerId: number,
): Promise<void> {
  const instance = requireProwlarrInstance(instances, instanceId);
  await indexerJson(instance, `/api/v1/indexer/${indexerId}`, { method: "DELETE" });
}

type SchemaCacheEntry = {
  rawByKey: Map<string, ProwlarrIndexerResource>;
  items: IndexerSchemaItem[];
};

function schemaKey(raw: ProwlarrIndexer): string {
  const implementation = raw.implementation?.trim() || "unknown";
  const definition = raw.definitionName?.trim() || raw.name?.trim() || implementation;
  return `${implementation}::${definition}`;
}

function flattenCategoryIds(categories: ProwlarrCategory[] | undefined): {
  ids: number[];
  names: string[];
} {
  const ids: number[] = [];
  const names: string[] = [];
  const seenIds = new Set<number>();
  const seenNames = new Set<string>();

  function walk(cats: ProwlarrCategory[], isTop: boolean) {
    for (const cat of cats) {
      if (cat.id == null || cat.id >= 100000) continue;
      if (!seenIds.has(cat.id)) {
        seenIds.add(cat.id);
        ids.push(cat.id);
      }
      const name = cat.name?.trim();
      if (isTop && name && !seenNames.has(name)) {
        seenNames.add(name);
        names.push(name);
      }
      if (Array.isArray(cat.subCategories)) walk(cat.subCategories, false);
    }
  }

  walk(categories ?? [], true);
  ids.sort((a, b) => a - b);
  return { ids, names };
}

function mapSchemaItem(raw: ProwlarrIndexerResource): IndexerSchemaItem | null {
  const implementation = raw.implementation?.trim();
  if (!implementation) return null;
  const name = raw.name?.trim() || raw.implementationName?.trim() || implementation;
  const { ids, names } = flattenCategoryIds(raw.capabilities?.categories);
  return {
    key: schemaKey(raw),
    name,
    implementation,
    implementationName: raw.implementationName?.trim() || implementation,
    definitionName: raw.definitionName?.trim() || name,
    protocol: parseProtocol(raw.protocol),
    privacy: parsePrivacy(raw.privacy),
    language: raw.language?.trim() || "",
    description: raw.description?.trim() || "",
    categoryIds: ids,
    categories: names,
  };
}

async function loadSchemaCache(
  instance: Instance,
): Promise<SchemaCacheEntry> {
  const cacheKey = `indexers:schema:${instance.id}`;
  const cached = activityListCache.get<SchemaCacheEntry>(cacheKey);
  if (cached) return cached;

  const rawList = await indexerJson<ProwlarrIndexerResource[]>(instance, "/api/v1/indexer/schema", {
    timeoutMs: 60_000,
  });
  const rawByKey = new Map<string, ProwlarrIndexerResource>();
  const items: IndexerSchemaItem[] = [];
  for (const raw of Array.isArray(rawList) ? rawList : []) {
    const item = mapSchemaItem(raw);
    if (!item) continue;
    rawByKey.set(item.key, raw);
    items.push(item);
  }
  items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const entry = { rawByKey, items };
  activityListCache.set(cacheKey, entry, 300_000);
  return entry;
}

export async function fetchIndexerSchemaList(
  instances: Instance[],
  instanceId: string,
): Promise<IndexerSchemaListResponse> {
  const instance = requireProwlarrInstance(instances, instanceId);
  const cache = await loadSchemaCache(instance);
  return { items: cache.items };
}

export async function fetchIndexerSchemaTemplate(
  instances: Instance[],
  instanceId: string,
  key: string,
): Promise<IndexerSchemaTemplate> {
  const instance = requireProwlarrInstance(instances, instanceId);
  const cache = await loadSchemaCache(instance);
  const raw = cache.rawByKey.get(key);
  if (!raw) throw new IndexerUpstreamError(404, `Indexer schema template not found: ${key}`);

  const fields = (Array.isArray(raw.fields) ? raw.fields : [])
    .map((field) => mapField(field))
    .filter((field): field is IndexerField => field != null);
  await attachGetUrls(instance, raw, fields);

  const implementation = raw.implementation?.trim() || "unknown";
  const name = raw.name?.trim() || raw.implementationName?.trim() || implementation;
  return {
    key,
    name,
    enable: raw.supportsRss === true,
    redirect: raw.redirect === true,
    appProfileId: raw.appProfileId ?? 0,
    priority: Number.isFinite(raw.priority) ? Number(raw.priority) : 25,
    downloadClientId: Number.isFinite(raw.downloadClientId) ? Number(raw.downloadClientId) : 0,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((id): id is number => Number.isFinite(id)) : [],
    protocol: parseProtocol(raw.protocol),
    privacy: parsePrivacy(raw.privacy),
    implementation,
    implementationName: raw.implementationName?.trim() || implementation,
    definitionName: raw.definitionName?.trim() || name,
    configContract: raw.configContract?.trim() || "",
    supportsRedirect: raw.supportsRedirect === true,
    supportsRss: raw.supportsRss === true,
    fields: maskEditFields(fields),
  };
}

function mapCategoryTree(raw: ProwlarrCategory): IndexerSchemaCategory | null {
  if (raw.id == null || !raw.name?.trim()) return null;
  const subs = (Array.isArray(raw.subCategories) ? raw.subCategories : [])
    .map((sub) => ({
      id: sub.id!,
      name: sub.name?.trim() || `Category ${sub.id}`,
    }))
    .filter((sub) => Number.isFinite(sub.id));
  return {
    id: raw.id,
    name: raw.name.trim(),
    subCategories: subs,
  };
}

export async function fetchIndexerSchemaCategories(
  instances: Instance[],
  instanceId: string,
): Promise<IndexerSchemaCategoriesResponse> {
  const instance = requireProwlarrInstance(instances, instanceId);
  const cacheKey = `indexers:categories:${instance.id}`;
  const cached = activityListCache.get<IndexerSchemaCategoriesResponse>(cacheKey);
  if (cached) return cached;

  const raw = await indexerJson<ProwlarrCategory[]>(instance, "/api/v1/indexer/categories", {
    timeoutMs: 15_000,
  });
  const categories = (Array.isArray(raw) ? raw : [])
    .map((cat) => mapCategoryTree(cat))
    .filter((cat): cat is IndexerSchemaCategory => cat != null);
  const result = { categories };
  activityListCache.set(cacheKey, result, 300_000);
  return result;
}

function mergeCreateResource(
  template: ProwlarrIndexerResource,
  patch: IndexerCreateRequest,
): ProwlarrIndexerResource {
  const base = mergeIndexerResource(template, patch);
  return {
    ...base,
    id: undefined,
    implementation: patch.implementation,
    implementationName: patch.implementationName,
    configContract: patch.configContract,
    definitionName: patch.definitionName,
  };
}

export async function createIndexer(
  instances: Instance[],
  instanceId: string,
  patch: IndexerCreateRequest,
  forceSave = false,
): Promise<void> {
  const instance = requireProwlarrInstance(instances, instanceId);
  const cache = await loadSchemaCache(instance);
  const key = `${patch.implementation}::${patch.definitionName}`;
  const template = cache.rawByKey.get(key);
  if (!template) {
    throw new IndexerUpstreamError(404, `Indexer schema template not found: ${key}`);
  }
  const merged = mergeCreateResource(template, patch);
  const suffix = forceSave ? "?forceSave=true" : "";
  await indexerJson(instance, `/api/v1/indexer${suffix}`, {
    method: "POST",
    body: merged,
    timeoutMs: 30_000,
  });
}

export async function testIndexerCreate(
  instances: Instance[],
  instanceId: string,
  patch: IndexerCreateRequest,
  forceTest = false,
): Promise<void> {
  const instance = requireProwlarrInstance(instances, instanceId);
  const cache = await loadSchemaCache(instance);
  const key = `${patch.implementation}::${patch.definitionName}`;
  const template = cache.rawByKey.get(key);
  if (!template) {
    throw new IndexerUpstreamError(404, `Indexer schema template not found: ${key}`);
  }
  const merged = mergeCreateResource(template, patch);
  const suffix = forceTest ? "?forceTest=true" : "";
  await indexerJson(instance, `/api/v1/indexer/test${suffix}`, {
    method: "POST",
    body: merged,
    timeoutMs: 30_000,
  });
}
