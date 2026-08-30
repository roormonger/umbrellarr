import type { Availability } from "@umbrellarr/shared";

/** Radarr MovieIndexFooter legend labels. */
export const MOVIE_POSTER_STATUS_LABELS: Record<Availability, string> = {
  downloaded: "Downloaded (Monitored)",
  downloadedUnmonitored: "Downloaded (Unmonitored)",
  missingMonitored: "Missing (Monitored)",
  missingUnmonitored: "Missing (Unmonitored)",
  queued: "Queued",
  unreleased: "Unreleased",
  continuing: "Continuing",
  ended: "Ended",
  downloading: "Downloading",
};

/** Sonarr SeriesIndexFooter legend labels. */
export const SERIES_POSTER_STATUS_LABELS: Record<Availability, string> = {
  downloaded: "Downloaded",
  downloadedUnmonitored: "Downloaded (Unmonitored)",
  missingMonitored: "Missing Episodes (Series monitored)",
  missingUnmonitored: "Missing Episodes (Series not monitored)",
  queued: "Queued",
  unreleased: "Unreleased",
  continuing: "Continuing (All episodes downloaded)",
  ended: "Ended (All episodes downloaded)",
  downloading: "Downloading (One or more episodes)",
};

/** Lidarr ArtistIndexFooter legend labels. */
export const ARTIST_POSTER_STATUS_LABELS: Record<Availability, string> = {
  downloaded: "Downloaded",
  downloadedUnmonitored: "Downloaded (Unmonitored)",
  missingMonitored: "Missing Tracks (Artist monitored)",
  missingUnmonitored: "Missing Tracks (Artist not monitored)",
  queued: "Queued",
  unreleased: "Unreleased",
  continuing: "Continuing (All tracks downloaded)",
  ended: "Ended (All tracks downloaded)",
  downloading: "Downloading",
};
