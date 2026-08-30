/** Parse optional `limit` query for library head responses. */
export function parseLibraryLimit(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const floored = Math.floor(n);
  return floored > 0 ? floored : undefined;
}
