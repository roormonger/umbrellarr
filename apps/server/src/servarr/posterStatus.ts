/**
 * Poster status-bar kinds mirrored from Arr frontend:
 * - Radarr: Utilities/Movie/getProgressBarKind.ts + MovieIndexFooter.css
 * - Sonarr: Utilities/Series/getProgressBarKind.ts + SeriesIndexFooter.css
 * - Lidarr: Utilities/Artist/getProgressBarKind.ts + ArtistIndexFooter.css
 */
import type { Availability } from "@umbrellarr/shared";

/** Radarr movie poster bar. */
export function moviePosterStatus(input: {
  hasFile: boolean;
  monitored: boolean;
  isAvailable: boolean;
  downloading?: boolean;
  status?: string;
}): Availability {
  if (input.downloading) return "queued";
  if (input.hasFile && input.monitored) return "downloaded";
  if (input.hasFile && !input.monitored) return "downloadedUnmonitored";
  if (input.status === "deleted") return "ended";
  if (input.isAvailable && input.monitored) return "missingMonitored";
  if (!input.monitored) return "missingUnmonitored";
  return "unreleased";
}

/** Sonarr series poster bar (progress === 100 when episodeCount is 0). */
export function seriesPosterStatus(input: {
  monitored: boolean;
  status?: string;
  episodeCount?: number;
  episodeFileCount?: number;
  downloading?: boolean;
}): Availability {
  if (input.downloading) return "downloading";
  const episodeCount = input.episodeCount ?? 0;
  const episodeFileCount = input.episodeFileCount ?? 0;
  const progress = episodeCount > 0 ? (episodeFileCount / episodeCount) * 100 : 100;
  if (progress >= 100) {
    return input.status === "ended" || input.status === "deleted" ? "ended" : "continuing";
  }
  return input.monitored ? "missingMonitored" : "missingUnmonitored";
}

/** Lidarr artist poster bar (progress === 100 when trackCount is 0). */
export function artistPosterStatus(input: {
  monitored: boolean;
  status?: string;
  trackCount?: number;
  trackFileCount?: number;
  downloading?: boolean;
}): Availability {
  if (input.downloading) return "downloading";
  const trackCount = input.trackCount ?? 0;
  const trackFileCount = input.trackFileCount ?? 0;
  const progress = trackCount > 0 ? (trackFileCount / trackCount) * 100 : 100;
  if (progress >= 100) {
    return input.status === "ended" || input.status === "deleted" ? "ended" : "continuing";
  }
  return input.monitored ? "missingMonitored" : "missingUnmonitored";
}
