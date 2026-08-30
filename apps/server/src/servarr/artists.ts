/**
 * Lidarr artist library snapshot.
 * Upstream: GET /api/v1/artist (+ qualityprofile, metadataprofile, tag, wanted/cutoff).
 */
import type { ArtistListItem, Instance } from "@umbrellarr/shared";
import { arrJson } from "./client.js";
import { lidarrArtistCoverPath, pickLidarrGridImage } from "./mediaCover.js";
import { artistPosterStatus } from "./posterStatus.js";
import { fetchQueueEntityIds } from "./queueIds.js";

type LidarrImage = {
  coverType?: string;
  url?: string;
  remoteUrl?: string;
};

type LidarrStatistics = {
  albumCount?: number;
  trackCount?: number;
  trackFileCount?: number;
  sizeOnDisk?: number;
  percentOfTracks?: number;
};

type LidarrArtist = {
  id: number;
  artistName?: string;
  sortName?: string;
  overview?: string;
  monitored: boolean;
  status?: string;
  qualityProfileId?: number;
  metadataProfileId?: number;
  added?: string;
  path?: string;
  tags?: number[];
  foreignArtistId?: string;
  genres?: string[];
  statistics?: LidarrStatistics;
  images?: LidarrImage[];
};

type QualityProfile = { id: number; name: string };
type MetadataProfile = { id: number; name: string };
type ArrTag = { id: number; label: string };

type WantedPage = {
  records?: Array<{ id?: number; artistId?: number }>;
  totalRecords?: number;
  page?: number;
  pageSize?: number;
};

function posterUrlFor(instance: Instance, artist: LidarrArtist): string | undefined {
  const poster = pickLidarrGridImage(artist.images);
  if (!poster) return undefined;

  // Lidarr `images[].url` is the SPA `/MediaCover/...` path (login HTML without a
  // session). Proxy the authenticated `/api/v1/mediacover/artist/{id}/{file}` instead.
  // Skip `.jpeg` posters — Lidarr's API route only matches jpg/png/gif.
  if (poster.url?.startsWith("/")) {
    const path = lidarrArtistCoverPath(artist.id, poster.url);
    return `/api/media/${encodeURIComponent(instance.id)}/image?path=${encodeURIComponent(path)}`;
  }

  return poster.remoteUrl && /^https?:\/\//i.test(poster.remoteUrl) ? poster.remoteUrl : undefined;
}

export function availabilityForArtist(
  artist: {
    monitored: boolean;
    status?: string;
    statistics?: LidarrStatistics;
  },
  downloading = false,
) {
  return artistPosterStatus({
    monitored: artist.monitored,
    status: artist.status,
    trackCount: artist.statistics?.trackCount,
    trackFileCount: artist.statistics?.trackFileCount,
    downloading,
  });
}

async function fetchCutoffUnmetArtistIds(instance: Instance): Promise<Set<number>> {
  const ids = new Set<number>();
  let page = 1;
  const pageSize = 500;

  for (;;) {
    const data = await arrJson<WantedPage>(
      instance,
      `/api/v1/wanted/cutoff?page=${page}&pageSize=${pageSize}&monitored=true`,
    );
    for (const record of data.records ?? []) {
      if (record.artistId != null) ids.add(record.artistId);
    }
    const total = data.totalRecords ?? 0;
    const seen = (page - 1) * pageSize + (data.records?.length ?? 0);
    if (seen >= total || (data.records?.length ?? 0) === 0) break;
    page += 1;
    if (page > 50) break;
  }

  return ids;
}

export function mapLidarrArtist(
  instance: Instance,
  artist: LidarrArtist,
  profiles: Map<number, string>,
  metadataProfiles: Map<number, string>,
  tags: Map<number, string>,
  cutoffIds: Set<number>,
  queuedIds: Set<number> = new Set(),
): ArtistListItem {
  const stats = artist.statistics;
  const title = artist.artistName ?? "Unknown Artist";
  return {
    kind: "artist",
    instanceId: instance.id,
    externalId: artist.id,
    title,
    sortTitle: artist.sortName ?? title,
    posterUrl: posterUrlFor(instance, artist),
    monitored: artist.monitored,
    inLibrary: true,
    hasFile: (stats?.trackFileCount ?? 0) > 0,
    availability: availabilityForArtist(artist, queuedIds.has(artist.id)),
    qualityProfileId: artist.qualityProfileId,
    qualityProfileName:
      artist.qualityProfileId != null ? profiles.get(artist.qualityProfileId) : undefined,
    metadataProfileId: artist.metadataProfileId,
    metadataProfileName:
      artist.metadataProfileId != null
        ? metadataProfiles.get(artist.metadataProfileId)
        : undefined,
    added: artist.added,
    path: artist.path,
    sizeOnDisk: stats?.sizeOnDisk,
    albumCount: stats?.albumCount,
    trackCount: stats?.trackCount,
    trackFileCount: stats?.trackFileCount,
    tags: (artist.tags ?? []).map((id) => tags.get(id) ?? String(id)),
    cutoffUnmet: cutoffIds.has(artist.id),
    genres: artist.genres ?? [],
    foreignArtistId: artist.foreignArtistId,
    status: artist.status,
  };
}

export async function fetchArtistsForInstance(instance: Instance): Promise<ArtistListItem[]> {
  const [artists, profiles, metadataProfiles, tagList, cutoffIds, queuedIds] = await Promise.all([
    arrJson<LidarrArtist[]>(instance, "/api/v1/artist", { timeoutMs: 90_000 }),
    arrJson<QualityProfile[]>(instance, "/api/v1/qualityprofile"),
    arrJson<MetadataProfile[]>(instance, "/api/v1/metadataprofile"),
    arrJson<ArrTag[]>(instance, "/api/v1/tag"),
    fetchCutoffUnmetArtistIds(instance).catch((error) => {
      console.warn(`[artists] cutoff lookup failed for ${instance.id}`, error);
      return new Set<number>();
    }),
    fetchQueueEntityIds(instance, "artistId"),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.id, p.name]));
  const metadataMap = new Map(metadataProfiles.map((p) => [p.id, p.name]));
  const tagMap = new Map(tagList.map((t) => [t.id, t.label]));

  return artists.map((artist) =>
    mapLidarrArtist(instance, artist, profileMap, metadataMap, tagMap, cutoffIds, queuedIds),
  );
}
