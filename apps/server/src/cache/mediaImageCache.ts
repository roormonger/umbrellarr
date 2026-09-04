/**
 * On-disk LRU for Arr MediaCover bytes proxied through /api/media/.../image.
 * Key includes instanceId + path (path often has lastWrite → busts on artwork refresh).
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const META_NAME = ".cache-meta.json";
const DEFAULT_MAX_BYTES = 500 * 1024 * 1024;

type MetaEntry = {
  file: string;
  bytes: number;
  contentType: string;
  atime: number;
};

type MetaFile = {
  version: 1;
  entries: Record<string, MetaEntry>;
};

export type MediaImageCacheHit = {
  body: Buffer;
  contentType: string;
};

export class MediaImageDiskCache {
  private readonly dir: string;
  private readonly maxBytes: number;
  private meta: MetaFile = { version: 1, entries: {} };
  private totalBytes = 0;
  private ready = false;
  private persistTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(dir: string, maxBytes = DEFAULT_MAX_BYTES) {
    this.dir = dir;
    this.maxBytes = maxBytes;
  }

  init(): void {
    if (this.ready) return;
    mkdirSync(this.dir, { recursive: true });
    const metaPath = path.join(this.dir, META_NAME);
    if (existsSync(metaPath)) {
      try {
        const parsed = JSON.parse(readFileSync(metaPath, "utf8")) as MetaFile;
        if (parsed?.version === 1 && parsed.entries && typeof parsed.entries === "object") {
          this.meta = parsed;
        }
      } catch {
        this.meta = { version: 1, entries: {} };
      }
    }
    this.reconcileWithDisk();
    this.ready = true;
  }

  private ensureReady(): void {
    if (!this.ready) this.init();
  }

  async get(instanceId: string, imagePath: string): Promise<MediaImageCacheHit | null> {
    this.ensureReady();
    const key = cacheKey(instanceId, imagePath);
    const entry = this.meta.entries[key];
    if (!entry) return null;
    const filePath = path.join(this.dir, entry.file);
    try {
      const body = await readFile(filePath);
      entry.atime = Date.now();
      this.schedulePersist();
      return { body, contentType: entry.contentType };
    } catch {
      delete this.meta.entries[key];
      this.totalBytes = Math.max(0, this.totalBytes - entry.bytes);
      this.schedulePersist();
      return null;
    }
  }

  async set(
    instanceId: string,
    imagePath: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    this.ensureReady();
    if (body.byteLength <= 0 || body.byteLength > this.maxBytes) return;

    const key = cacheKey(instanceId, imagePath);
    const file = `${hashKey(key)}.bin`;
    const filePath = path.join(this.dir, file);
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

    try {
      await writeFile(tmpPath, body);
      renameSync(tmpPath, filePath);
    } catch {
      try {
        await unlink(tmpPath);
      } catch {
        // ignore
      }
      return;
    }

    const prev = this.meta.entries[key];
    if (prev) {
      this.totalBytes = Math.max(0, this.totalBytes - prev.bytes);
      if (prev.file !== file) {
        try {
          unlinkSync(path.join(this.dir, prev.file));
        } catch {
          // ignore
        }
      }
    }

    this.meta.entries[key] = {
      file,
      bytes: body.byteLength,
      contentType: contentType || "image/jpeg",
      atime: Date.now(),
    };
    this.totalBytes += body.byteLength;
    this.evictIfNeeded();
    this.schedulePersist();
  }

  private reconcileWithDisk(): void {
    const knownFiles = new Set<string>();
    let total = 0;
    for (const [key, entry] of Object.entries(this.meta.entries)) {
      const filePath = path.join(this.dir, entry.file);
      if (!existsSync(filePath)) {
        delete this.meta.entries[key];
        continue;
      }
      try {
        const size = statSync(filePath).size;
        entry.bytes = size;
        total += size;
        knownFiles.add(entry.file);
      } catch {
        delete this.meta.entries[key];
      }
    }
    this.totalBytes = total;

    for (const name of readdirSync(this.dir)) {
      if (name === META_NAME || name.endsWith(".tmp")) continue;
      if (!knownFiles.has(name)) {
        try {
          unlinkSync(path.join(this.dir, name));
        } catch {
          // ignore
        }
      }
    }
    this.persistSync();
  }

  private evictIfNeeded(): void {
    if (this.totalBytes <= this.maxBytes) return;
    const ranked = Object.entries(this.meta.entries).sort((a, b) => a[1].atime - b[1].atime);
    for (const [key, entry] of ranked) {
      if (this.totalBytes <= this.maxBytes * 0.9) break;
      try {
        unlinkSync(path.join(this.dir, entry.file));
      } catch {
        // ignore
      }
      delete this.meta.entries[key];
      this.totalBytes = Math.max(0, this.totalBytes - entry.bytes);
    }
  }

  private schedulePersist(): void {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = undefined;
      this.persistSync();
    }, 750);
    this.persistTimer.unref?.();
  }

  private persistSync(): void {
    const metaPath = path.join(this.dir, META_NAME);
    const tmp = `${metaPath}.${process.pid}.tmp`;
    try {
      writeFileSync(tmp, JSON.stringify(this.meta));
      renameSync(tmp, metaPath);
    } catch {
      try {
        unlinkSync(tmp);
      } catch {
        // ignore
      }
    }
  }
}

function cacheKey(instanceId: string, imagePath: string): string {
  return `${instanceId}\0${imagePath}`;
}

function hashKey(key: string): string {
  return createHash("sha1").update(key).digest("hex");
}

/** Singleton used by media routes; initialized from server boot. */
let sharedCache: MediaImageDiskCache | undefined;

export function initMediaImageCache(dataDir: string): MediaImageDiskCache {
  const dir = path.join(dataDir, "media-cache");
  sharedCache = new MediaImageDiskCache(dir);
  sharedCache.init();
  console.log(`[media-cache] ready at ${dir}`);
  return sharedCache;
}

export function getMediaImageCache(): MediaImageDiskCache | undefined {
  return sharedCache;
}
