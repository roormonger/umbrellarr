import type { ArrKind, WantedListItem, WantedMode } from "@umbrellarr/shared";

export { kindLabel, instanceNameFor } from "@/lib/queueDisplay";

export function wantedItemKey(item: Pick<WantedListItem, "instanceId" | "kind" | "id">): string {
  return `${item.instanceId}:${item.kind}:${item.id}`;
}

export function formatEpisodeLabel(season?: number, episode?: number): string | null {
  if (season == null || episode == null) return null;
  return `${season}x${String(episode).padStart(2, "0")}`;
}

export function wantedRowPrimary(item: WantedListItem): string {
  if (item.kind === "radarr") {
    return item.year != null ? `${item.title} (${item.year})` : item.title;
  }
  if (item.kind === "sonarr") {
    return item.seriesTitle ?? item.title;
  }
  if (item.artistName && item.albumTitle) {
    return `${item.artistName} — ${item.albumTitle}`;
  }
  return item.artistName ?? item.albumTitle ?? item.title;
}

export function wantedRowSecondary(item: WantedListItem): string | null {
  if (item.kind === "sonarr") {
    const ep = formatEpisodeLabel(item.seasonNumber, item.episodeNumber);
    if (ep && item.episodeTitle) return `${ep} — ${item.episodeTitle}`;
    if (ep) return ep;
    return item.episodeTitle ?? null;
  }
  if (item.kind === "lidarr") {
    return item.albumType ?? null;
  }
  return null;
}

export function wantedDetailPath(item: WantedListItem): string | null {
  if (item.kind === "radarr" && item.movieId != null) {
    return `/movies/${item.instanceId}/${item.movieId}`;
  }
  if (item.kind === "sonarr" && item.seriesId != null) {
    return `/shows/${item.instanceId}/${item.seriesId}`;
  }
  if (item.kind === "lidarr" && item.artistId != null) {
    return `/music/${item.instanceId}/${item.artistId}`;
  }
  return null;
}

export function formatWantedDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day} ${year}`;
}

export function wantedDateValue(item: WantedListItem): string | undefined {
  return item.airDate ?? item.releaseDate;
}

export function wantedMatchesSearch(item: WantedListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.title,
    item.seriesTitle,
    item.episodeTitle,
    item.artistName,
    item.albumTitle,
    item.albumType,
    item.year != null ? String(item.year) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function wantedEmptyMessage(mode: WantedMode): string {
  return mode === "missing" ? "No missing items." : "No cutoff unmet items.";
}

export function groupWantedIdsByInstance(
  items: WantedListItem[],
): Array<{ instanceId: string; kind: ArrKind; ids: number[] }> {
  const map = new Map<string, { instanceId: string; kind: ArrKind; ids: number[] }>();
  for (const item of items) {
    const key = `${item.instanceId}:${item.kind}`;
    const existing = map.get(key);
    if (existing) {
      existing.ids.push(item.id);
    } else {
      map.set(key, { instanceId: item.instanceId, kind: item.kind, ids: [item.id] });
    }
  }
  return [...map.values()];
}
