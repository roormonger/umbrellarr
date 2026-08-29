/** Normalize for prefix matching: collapse trailing slashes (keep root "/"). */
export function normalizeRootPath(path: string): string {
  if (!path) return "";
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/";
}

/**
 * Join a Radarr root folder and movie folder into a full path.
 * Folder may be displayed with a leading slash; that is stripped before join.
 */
export function joinMoviePath(rootFolderPath: string, folderName: string): string {
  const root = normalizeRootPath(rootFolderPath.trim());
  const folder = folderName.trim().replace(/^\/+/, "");
  if (!root) return folder ? `/${folder}` : "";
  if (!folder) return root;
  return `${root}/${folder}`;
}

export type SplitMoviePathResult = {
  /** Matching root path, or null when no configured root prefixes the movie path. */
  rootFolderPath: string | null;
  /**
   * Movie folder relative to the root, with a leading slash when non-empty
   * (e.g. "/10 Cloverfield Lane (2016)").
   * Fallback when no root matches: the full original path (so nothing is lost).
   */
  folderName: string;
};

/**
 * Split a movie path against configured root folders.
 * Picks the longest matching root prefix (case-sensitive, POSIX-style).
 * If none match, rootFolderPath is null and folderName keeps the full path.
 */
export function splitMoviePath(
  moviePath: string,
  rootFolders: Array<{ path: string }>,
): SplitMoviePathResult {
  const full = moviePath.trim();
  if (!full) {
    return { rootFolderPath: null, folderName: "" };
  }

  const normalizedFull = normalizeRootPath(full);
  let best: { root: string; length: number } | null = null;

  for (const root of rootFolders) {
    const normalizedRoot = normalizeRootPath(root.path);
    if (!normalizedRoot) continue;

    const matchesExact = normalizedFull === normalizedRoot;
    const matchesPrefix =
      normalizedFull.startsWith(`${normalizedRoot}/`) || matchesExact;

    if (!matchesPrefix) continue;
    if (!best || normalizedRoot.length > best.length) {
      best = { root: normalizedRoot, length: normalizedRoot.length };
    }
  }

  if (!best) {
    return { rootFolderPath: null, folderName: full.startsWith("/") ? full : `/${full}` };
  }

  if (normalizedFull === best.root) {
    return { rootFolderPath: best.root, folderName: "" };
  }

  const remainder = normalizedFull.slice(best.root.length); // starts with /
  return { rootFolderPath: best.root, folderName: remainder || "/" };
}

/** Format Arr freeSpace bytes for root-folder select labels. */
export function formatFreeSpace(bytes: number): string {
  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"] as const;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  // Match Arr-style labels (e.g. "17.1 TiB"); whole bytes stay integer.
  const digits = unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function rootFolderLabel(path: string, freeSpace?: number): string {
  if (typeof freeSpace === "number") {
    return `${path} · ${formatFreeSpace(freeSpace)} free`;
  }
  return path;
}
