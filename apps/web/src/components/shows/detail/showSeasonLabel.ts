export function seasonLabel(seasonNumber: number): string {
  return seasonNumber === 0 ? "Specials" : `Season ${seasonNumber}`;
}

export function seasonCountTone(
  fileCount: number,
  episodeCount: number,
): "complete" | "partial" | "empty" {
  if (episodeCount <= 0) return "empty";
  if (fileCount >= episodeCount) return "complete";
  if (fileCount > 0) return "partial";
  return "empty";
}
