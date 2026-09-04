import type { ArrKind, HistoryKind, HistoryListItem } from "@umbrellarr/shared";

export { kindLabel, instanceNameFor } from "@/lib/queueDisplay";

export function historyItemKey(item: Pick<HistoryListItem, "instanceId" | "id">): string {
  return `${item.instanceId}:${item.id}`;
}

function formatEpisode(season?: number, episode?: number): string | null {
  if (season == null || episode == null) return null;
  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

export function historyRowPrimary(item: HistoryListItem): string {
  if (item.kind === "prowlarr") {
    return item.indexerName ?? (item.sourceTitle || "Indexer");
  }
  if (item.kind === "radarr") {
    const movie = item.movieTitle ?? item.sourceTitle;
    return item.year != null ? `${movie} (${item.year})` : movie;
  }
  if (item.kind === "sonarr") {
    return item.seriesTitle ?? item.sourceTitle;
  }
  if (item.artistName && item.albumTitle) {
    return `${item.artistName} — ${item.albumTitle}`;
  }
  return item.artistName ?? item.albumTitle ?? item.sourceTitle;
}

export function historyRowSecondary(item: HistoryListItem): string | null {
  if (item.kind === "prowlarr") {
    const query = item.sourceTitle || item.data.query;
    if (query && query !== item.indexerName) return query;
    const source = item.data.source;
    return source || null;
  }
  if (item.kind === "radarr") {
    const release = item.sourceTitle;
    const movie = item.movieTitle ?? "";
    if (release && release !== movie) return release;
    return null;
  }
  if (item.kind === "sonarr") {
    const episode = formatEpisode(item.seasonNumber, item.episodeNumber);
    if (episode && item.episodeTitle) return `${episode} — ${item.episodeTitle}`;
    if (episode) return episode;
    if (item.episodeTitle) return item.episodeTitle;
    const release = item.sourceTitle;
    const series = item.seriesTitle ?? "";
    if (release && release !== series) return release;
    return null;
  }
  if (item.trackTitle) return item.trackTitle;
  const release = item.sourceTitle;
  const library =
    item.artistName && item.albumTitle
      ? `${item.artistName} - ${item.albumTitle}`
      : (item.artistName ?? item.albumTitle ?? "");
  if (release && release !== library) return release;
  return null;
}

export function historyDetailPath(item: HistoryListItem): string | null {
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

export function formatHistoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfEvent = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfEvent.getTime() === startOfToday.getTime()) {
    return date
      .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      .replace(/\s/g, "")
      .toLowerCase();
  }
  if (startOfEvent.getTime() === startOfYesterday.getTime()) {
    return "Yesterday";
  }

  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  if (year === now.getFullYear()) {
    return `${month} ${day}`;
  }
  return `${month} ${day} ${year}`;
}

export function formatHistoryDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function formatScore(score?: number): string {
  if (score == null) return "—";
  return score > 0 ? `+${score}` : String(score);
}

export function formatElapsedMs(value?: string): string {
  if (!value) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return value.endsWith("ms") ? value : `${value}ms`;
  return `${Math.round(n)}ms`;
}

export function historyCategories(item: HistoryListItem): string[] {
  const raw = item.data.categories ?? item.data.category ?? "";
  if (!raw) return [];
  return raw
    .split(/[,|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function historyEventLabel(
  eventType: HistoryListItem["eventType"],
  kind: HistoryKind | ArrKind,
): string {
  const labels: Partial<Record<HistoryListItem["eventType"], string>> = {
    grabbed: "Grabbed",
    downloadFailed: "Download failed",
    downloadIgnored: "Ignored",
    downloadFolderImported: kind === "sonarr" ? "Episode imported" : "Imported",
    movieFolderImported: "Folder imported",
    seriesFolderImported: "Folder imported",
    movieFileDeleted: "File deleted",
    episodeFileDeleted: "File deleted",
    trackFileDeleted: "File deleted",
    movieFileRenamed: "Renamed",
    episodeFileRenamed: "Renamed",
    trackFileRenamed: "Renamed",
    trackFileImported: "Track imported",
    albumFolderImported: "Album folder imported",
    artistFolderImported: "Artist folder imported",
    trackFileRetagged: "Retagged",
    indexerQuery: "Indexer Query",
    indexerRss: "Indexer RSS Query",
    indexerAuth: "Indexer Auth",
    indexerInfo: "Indexer Info",
    indexerDownload: "Indexer Grab",
    unknown: "Unknown",
  };
  return labels[eventType] ?? "Unknown";
}
