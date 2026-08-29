/** Prefer Radarr's grid-sized poster so the UI does not download full artwork. */
export function toGridPosterPath(path: string): string {
  return path.replace(/\/poster(\.[a-z0-9]+)$/i, "/poster-500$1");
}

/** Upgrade a stored poster URL (API path or MediaCover path) to the -500 variant. */
export function toGridPosterUrl(url: string): string {
  return url.replace(/poster(?!-)\.(jpg|jpeg|png|webp)/i, "poster-500.$1");
}
