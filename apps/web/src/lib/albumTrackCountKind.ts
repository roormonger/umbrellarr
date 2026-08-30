import type { ArtistAlbum } from "@umbrellarr/shared";

/** Lidarr `getTrackCountKind` — complete / unmonitored / missing. */
export type AlbumTrackCountKind = "complete" | "unmonitored" | "missing";

export function albumTrackCountKind(album: ArtistAlbum): AlbumTrackCountKind {
  const files = album.statistics.trackFileCount ?? 0;
  const total = album.statistics.totalTrackCount ?? album.statistics.trackCount ?? 0;
  if (total > 0 && files >= total) return "complete";
  if (!album.monitored) return "unmonitored";
  return "missing";
}

export function albumTypeStats(albums: ArtistAlbum[]): {
  trackFileCount: number;
  trackCount: number;
  sizeOnDisk: number;
  kind: AlbumTrackCountKind;
} {
  let trackFileCount = 0;
  let trackCount = 0;
  let sizeOnDisk = 0;
  let anyMonitored = false;
  for (const album of albums) {
    trackFileCount += album.statistics.trackFileCount ?? 0;
    trackCount += album.statistics.totalTrackCount ?? album.statistics.trackCount ?? 0;
    sizeOnDisk += album.statistics.sizeOnDisk ?? 0;
    if (album.monitored) anyMonitored = true;
  }
  const kind: AlbumTrackCountKind =
    trackCount > 0 && trackFileCount >= trackCount
      ? "complete"
      : anyMonitored
        ? "missing"
        : "unmonitored";
  return { trackFileCount, trackCount, sizeOnDisk, kind };
}
