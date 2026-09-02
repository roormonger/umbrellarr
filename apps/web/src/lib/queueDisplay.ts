import type { ArrKind, InstancePublic, QueueListItem } from "@umbrellarr/shared";

export function queueItemKey(item: Pick<QueueListItem, "instanceId" | "id">): string {
  return `${item.instanceId}:${item.id}`;
}

export function kindLabel(kind: ArrKind): string {
  if (kind === "radarr") return "Movies";
  if (kind === "sonarr") return "Shows";
  return "Music";
}

function formatEpisode(season?: number, episode?: number): string | null {
  if (season == null || episode == null) return null;
  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

export function queueRowPrimary(item: QueueListItem): string {
  if (item.kind === "radarr") {
    const movie = item.movieTitle ?? item.title;
    return item.year != null ? `${movie} (${item.year})` : movie;
  }
  if (item.kind === "sonarr") {
    return item.seriesTitle ?? item.title;
  }
  if (item.artistName && item.albumTitle) {
    return `${item.artistName} — ${item.albumTitle}`;
  }
  return item.artistName ?? item.albumTitle ?? item.title;
}

export function queueRowSecondary(item: QueueListItem): string | null {
  if (item.kind === "radarr") {
    const release = item.title;
    const movie = item.movieTitle ?? item.title;
    if (release && release !== movie) return release;
    if (item.languages.length > 0) return item.languages.join(", ");
    return null;
  }
  if (item.kind === "sonarr") {
    const episode = formatEpisode(item.seasonNumber, item.episodeNumber);
    if (episode && item.episodeTitle) return `${episode} — ${item.episodeTitle}`;
    if (episode) return episode;
    if (item.episodeTitle) return item.episodeTitle;
    const release = item.title;
    const series = item.seriesTitle ?? "";
    if (release && release !== series) return release;
    return null;
  }
  const release = item.title;
  const library =
    item.artistName && item.albumTitle
      ? `${item.artistName} - ${item.albumTitle}`
      : (item.artistName ?? item.albumTitle ?? "");
  if (release && release !== library) return release;
  return null;
}

export function instanceNameFor(
  instances: InstancePublic[],
  instanceId: string,
): string {
  return instances.find((instance) => instance.id === instanceId)?.name ?? instanceId;
}

export function formatFormats(item: QueueListItem): string {
  if (item.customFormats.length === 0) {
    return item.customFormatScore != null ? String(item.customFormatScore) : "—";
  }
  const score =
    item.customFormatScore != null
      ? ` (${item.customFormatScore > 0 ? "+" : ""}${item.customFormatScore})`
      : "";
  return `${item.customFormats.join(", ")}${score}`;
}

export function progressPercent(item: QueueListItem): number | null {
  if (item.size == null || item.size <= 0) return null;
  const left = item.sizeleft ?? 0;
  return Math.max(0, Math.min(100, Math.round(((item.size - left) / item.size) * 100)));
}

export function groupQueueItemsByInstance(
  items: QueueListItem[],
): Map<string, QueueListItem[]> {
  const map = new Map<string, QueueListItem[]>();
  for (const item of items) {
    const list = map.get(item.instanceId) ?? [];
    list.push(item);
    map.set(item.instanceId, list);
  }
  return map;
}
