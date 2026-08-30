/**
 * Lidarr albums for an artist, grouped by albumType (Album / EP / Single / …).
 * Upstream: GET /api/v1/album?artistId=
 * UI grouping: ArtistDetails.js albumTypes + ArtistDetailsSeason.js
 */
import type { ArtistAlbum, ArtistAlbumTypeGroup, Instance } from "@umbrellarr/shared";
import { arrJson } from "./client.js";

type LidarrAlbumStats = {
  trackCount?: number;
  trackFileCount?: number;
  totalTrackCount?: number;
  sizeOnDisk?: number;
};

type LidarrAlbum = {
  id: number;
  title?: string;
  albumType?: string;
  releaseDate?: string;
  monitored?: boolean;
  foreignAlbumId?: string;
  ratings?: { value?: number };
  statistics?: LidarrAlbumStats;
};

function requireLidarr(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) throw new Error(`Instance ${instanceId} not found`);
  if (instance.kind !== "lidarr") {
    throw new Error(`Instance ${instanceId} is not a Lidarr client`);
  }
  return instance;
}

function mapAlbum(album: LidarrAlbum): ArtistAlbum {
  const stats = album.statistics ?? {};
  return {
    id: album.id,
    title: album.title ?? "Untitled",
    albumType: album.albumType?.trim() || "Other",
    releaseDate: album.releaseDate,
    monitored: Boolean(album.monitored),
    rating: album.ratings?.value,
    foreignAlbumId: album.foreignAlbumId,
    statistics: {
      trackCount: stats.trackCount,
      trackFileCount: stats.trackFileCount,
      totalTrackCount: stats.totalTrackCount,
      sizeOnDisk: stats.sizeOnDisk,
    },
  };
}

function releaseDateMs(value?: string): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Group albums by albumType. Prefer artist.albumTypes order when provided;
 * otherwise discovery order from albums (first-seen), with "Other" last.
 */
export function groupAlbumsByType(
  albums: ArtistAlbum[],
  albumTypes?: string[],
): ArtistAlbumTypeGroup[] {
  const byType = new Map<string, ArtistAlbum[]>();
  for (const album of albums) {
    const key = album.albumType || "Other";
    const list = byType.get(key) ?? [];
    list.push(album);
    byType.set(key, list);
  }

  for (const list of byType.values()) {
    list.sort((a, b) => releaseDateMs(b.releaseDate) - releaseDateMs(a.releaseDate));
  }

  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const type of albumTypes ?? []) {
    const t = type.trim();
    if (!t || seen.has(t) || !byType.has(t)) continue;
    ordered.push(t);
    seen.add(t);
  }
  for (const type of byType.keys()) {
    if (seen.has(type) || type === "Other") continue;
    ordered.push(type);
    seen.add(type);
  }
  if (byType.has("Other") && !seen.has("Other")) ordered.push("Other");

  return ordered.map((albumType) => ({
    albumType,
    albums: byType.get(albumType) ?? [],
  }));
}

export async function fetchArtistAlbums(
  instances: Instance[],
  instanceId: string,
  artistId: number,
  albumTypes?: string[],
): Promise<ArtistAlbumTypeGroup[]> {
  const instance = requireLidarr(instances, instanceId);
  const [albums, artist] = await Promise.all([
    arrJson<LidarrAlbum[]>(instance, `/api/v1/album?artistId=${artistId}`),
    albumTypes
      ? Promise.resolve(null)
      : arrJson<{ albumTypes?: string[] }>(instance, `/api/v1/artist/${artistId}`),
  ]);
  const types = albumTypes ?? artist?.albumTypes;
  return groupAlbumsByType(albums.map(mapAlbum), types);
}

export async function setAlbumsMonitored(
  instances: Instance[],
  instanceId: string,
  albumIds: number[],
  monitored: boolean,
): Promise<void> {
  const instance = requireLidarr(instances, instanceId);
  await arrJson(instance, "/api/v1/album/monitor", {
    method: "PUT",
    body: { albumIds, monitored },
  });
}

export async function searchAlbum(
  instances: Instance[],
  instanceId: string,
  albumId: number,
): Promise<void> {
  const instance = requireLidarr(instances, instanceId);
  await arrJson(instance, "/api/v1/command", {
    method: "POST",
    body: { name: "AlbumSearch", albumIds: [albumId] },
  });
}
