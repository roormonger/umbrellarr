/** Prefer Radarr's grid-sized poster so the UI does not download full artwork. */
export function toGridPosterPath(path: string): string {
  return path.replace(/\/poster(\.[a-z0-9]+)$/i, "/poster-500$1");
}

/** Upgrade a stored poster URL (API path or MediaCover path) to the -500 variant. */
export function toGridPosterUrl(url: string): string {
  return url.replace(/poster(?!-)\.(jpg|jpeg|png|webp)/i, "poster-500.$1");
}

/**
 * Lidarr does not serve SPA `/MediaCover/{id}/poster.jpg` with an API key
 * (that path 302s to the login HTML). Authenticated covers are
 * `/api/v1/mediacover/artist|{album}/{id}/{filename}`.
 * Lidarr's API route only matches `.jpg` / `.png` / `.gif` — not `.jpeg`.
 */
export function toLidarrCoverApiPath(path: string): string {
  const clean = path.split("?")[0] ?? path;
  const without500 = clean.replace(/\/poster-500(\.[a-z0-9]+)$/i, "/poster$1");

  if (/^\/api\/v1\/mediacover\//i.test(without500)) {
    return without500;
  }

  const prefixed = without500.match(/^\/MediaCover\/(Artist|Album)\/(\d+)\/([^/]+)$/i);
  if (prefixed) {
    return `/api/v1/mediacover/${prefixed[1].toLowerCase()}/${prefixed[2]}/${prefixed[3]}`;
  }

  const bare = without500.match(/^\/MediaCover\/(\d+)\/([^/]+)$/i);
  if (bare) {
    return `/api/v1/mediacover/artist/${bare[1]}/${bare[2]}`;
  }

  return without500;
}

/** Lidarr MediaCover API filename constraint (jpg|png|gif — not jpeg). */
export function isLidarrApiCoverFilename(filename: string): boolean {
  return /\.(jpg|png|gif)$/i.test(filename);
}

export function lidarrCoverFilename(imageUrl?: string): string | undefined {
  const raw = (imageUrl ?? "").split("?")[0] ?? "";
  const filename = raw.includes("/") ? raw.split("/").pop() : raw;
  return filename || undefined;
}

const LIDARR_GRID_COVER_TYPES = [
  "poster",
  "cover",
  "fanart",
  "banner",
  "clearlogo",
  "logo",
  "headshot",
] as const;

export type LidarrCoverImage = {
  coverType?: string;
  url?: string;
  remoteUrl?: string;
};

/** Prefer a cover the Lidarr API can actually serve (skip `.jpeg` posters). */
export function pickLidarrGridImage(images?: LidarrCoverImage[]): LidarrCoverImage | undefined {
  const list = images ?? [];
  for (const type of LIDARR_GRID_COVER_TYPES) {
    const img = list.find((item) => {
      if (item.coverType !== type) return false;
      const filename = lidarrCoverFilename(item.url);
      return Boolean(filename && isLidarrApiCoverFilename(filename));
    });
    if (img) return img;
  }
  return list.find((item) => item.coverType === "poster") ?? list.find((item) => item.coverType === "cover");
}

/** Artist-list cover path from Lidarr `images[].url` + artist id. */
export function lidarrArtistCoverPath(artistId: number, imageUrl?: string): string {
  const filename = lidarrCoverFilename(imageUrl) ?? "poster.jpg";
  const safe = filename.replace(/^poster-500(\.[a-z0-9]+)$/i, "poster$1") || "poster.jpg";
  return `/api/v1/mediacover/artist/${artistId}/${safe}`;
}

export function isImageContentType(contentType: string | null): boolean {
  if (!contentType) return true;
  const mime = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return mime.startsWith("image/") || mime === "application/octet-stream";
}

/** Local Lidarr cover paths to try. Skip `.jpeg` — the API route does not match it. */
export function lidarrCoverPathCandidates(path: string): string[] {
  const primary = toLidarrCoverApiPath(path);
  const out: string[] = [];
  const filenameOf = (value: string) => value.split("/").pop() ?? "";
  if (isLidarrApiCoverFilename(filenameOf(primary))) out.push(primary);

  const asJpg = primary.replace(/\.jpeg$/i, ".jpg");
  if (asJpg !== primary && isLidarrApiCoverFilename(filenameOf(asJpg))) out.push(asJpg);

  const sized = primary.replace(/\/poster(\.jpe?g)$/i, "/poster-250$1").replace(/\.jpeg$/i, ".jpg");
  if (sized !== primary && isLidarrApiCoverFilename(filenameOf(sized))) out.push(sized);

  return [...new Set(out)];
}

export function lidarrArtistIdFromCoverPath(path: string): number | undefined {
  const api = path.match(/\/api\/v1\/mediacover\/artist\/(\d+)\//i);
  if (api) return Number(api[1]);
  const spa = path.match(/^\/MediaCover\/(?:Artist\/)?(\d+)\//i);
  if (spa) return Number(spa[1]);
  return undefined;
}

export function lidarrFallbackCoverApiPaths(
  artistId: number,
  images?: LidarrCoverImage[],
  exceptPath?: string,
): string[] {
  const except = exceptPath ? toLidarrCoverApiPath(exceptPath) : undefined;
  const paths: string[] = [];
  for (const type of LIDARR_GRID_COVER_TYPES) {
    const img = images?.find((item) => item.coverType === type);
    const filename = lidarrCoverFilename(img?.url);
    if (!filename || !isLidarrApiCoverFilename(filename)) continue;
    const apiPath = `/api/v1/mediacover/artist/${artistId}/${filename}`;
    if (apiPath !== except) paths.push(apiPath);
  }
  return [...new Set(paths)];
}

export function pickLidarrPosterRemoteUrl(images?: LidarrCoverImage[]): string | undefined {
  const poster =
    images?.find((img) => img.coverType === "poster") ??
    images?.find((img) => img.coverType === "cover");
  return poster?.remoteUrl;
}

export function isPublicHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0") return false;
    if (host === "127.0.0.1" || host === "::1") return false;
    const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4) {
      const a = Number(ipv4[1]);
      const b = Number(ipv4[2]);
      if (a === 0 || a === 10 || a === 127) return false;
      if (a === 169 && b === 254) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
    }
    return true;
  } catch {
    return false;
  }
}
