/**
 * Lidarr album track list for the artist album modal.
 * Upstream: GET /api/v1/album/{id}, /track?albumId=, /trackfile?albumId=
 */
import type {
  ArtistAlbum,
  ArtistAlbumTrack,
  ArtistAlbumTracksResponse,
  Instance,
} from "@umbrellarr/shared";
import { arrJson } from "./client.js";
import {
  lidarrCoverFilename,
  pickLidarrGridImage,
  toLidarrCoverApiPath,
  type LidarrCoverImage,
} from "./mediaCover.js";

type LidarrAlbumStats = {
  trackCount?: number;
  trackFileCount?: number;
  totalTrackCount?: number;
  sizeOnDisk?: number;
};

type LidarrAlbumRelease = {
  id?: number;
  foreignReleaseId?: string;
  title?: string;
  status?: string;
  country?: string[] | string;
  label?: string[] | string;
  media?: Array<{ mediumNumber?: number; number?: number; name?: string }>;
};

type LidarrAlbum = {
  id: number;
  artistId?: number;
  title?: string;
  albumType?: string;
  releaseDate?: string;
  monitored?: boolean;
  foreignAlbumId?: string;
  ratings?: { value?: number };
  statistics?: LidarrAlbumStats;
  images?: LidarrCoverImage[];
  artist?: { artistName?: string; foreignArtistId?: string };
  releases?: LidarrAlbumRelease[];
};

type LidarrTrackFile = {
  id: number;
  path?: string;
  relativePath?: string;
  size?: number;
  quality?: { quality?: { id?: number; name?: string } };
  mediaInfo?: {
    audioBitrate?: number;
    audioChannels?: number;
    audioCodec?: string;
    audioSampleRate?: number;
  };
  albumId?: number;
};

type LidarrTrack = {
  id: number;
  artistId?: number;
  albumId?: number;
  trackFileId?: number;
  title?: string;
  duration?: number;
  trackNumber?: string | number;
  absoluteTrackNumber?: number;
  mediumNumber?: number;
  hasFile?: boolean;
  foreignTrackId?: string;
  foreignRecordingId?: string;
  artist?: { artistName?: string; foreignArtistId?: string };
};

function requireLidarr(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) throw new Error(`Instance ${instanceId} not found`);
  if (instance.kind !== "lidarr") {
    throw new Error(`Instance ${instanceId} is not a Lidarr client`);
  }
  return instance;
}

function padTrackNumber(value: string | number | undefined): string {
  if (value == null || value === "") return "";
  const text = String(value);
  return text.length >= 2 ? text : text.padStart(2, "0");
}

function mediaCoverUrl(instance: Instance, path: string): string {
  return `/api/media/${encodeURIComponent(instance.id)}/image?path=${encodeURIComponent(path)}`;
}

function coverUrlFor(instance: Instance, album: LidarrAlbum): string | undefined {
  const cover = pickLidarrGridImage(album.images);
  if (!cover) return undefined;
  if (cover.url?.startsWith("/")) {
    const mapped = toLidarrCoverApiPath(cover.url);
    const filename = lidarrCoverFilename(cover.url)?.replace(/^cover-500(\.[a-z0-9]+)$/i, "cover$1");
    const path = /\/mediacover\/album\//i.test(mapped)
      ? mapped
      : `/api/v1/mediacover/album/${album.id}/${filename || "cover.jpg"}`;
    return mediaCoverUrl(instance, path);
  }
  return cover.remoteUrl && /^https?:\/\//i.test(cover.remoteUrl) ? cover.remoteUrl : undefined;
}

function pickRelease(album: LidarrAlbum): LidarrAlbumRelease | undefined {
  const releases = album.releases ?? [];
  if (releases.length === 0) return undefined;
  const official = releases.find((r) => (r.status ?? "").toLowerCase() === "official");
  return official ?? releases[0];
}

function yearFromReleaseDate(value?: string): number | undefined {
  if (!value) return undefined;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : undefined;
}

function formatAudioInfo(file?: LidarrTrackFile): string | undefined {
  const info = file?.mediaInfo;
  if (!info) return undefined;
  const codec = info.audioCodec?.trim();
  const bitrate =
    info.audioBitrate != null && Number.isFinite(info.audioBitrate)
      ? `${Math.round(info.audioBitrate / 1000)} kbps`
      : undefined;
  const sample =
    info.audioSampleRate != null && Number.isFinite(info.audioSampleRate)
      ? `${(info.audioSampleRate / 1000).toFixed(1)} kHz`
      : undefined;
  const parts = [codec, bitrate, sample].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function mapAlbum(instance: Instance, album: LidarrAlbum): ArtistAlbum {
  const stats = album.statistics ?? {};
  return {
    id: album.id,
    title: album.title ?? "Untitled",
    albumType: album.albumType?.trim() || "Other",
    releaseDate: album.releaseDate,
    monitored: Boolean(album.monitored),
    rating: album.ratings?.value,
    foreignAlbumId: album.foreignAlbumId,
    coverUrl: coverUrlFor(instance, album),
    statistics: {
      trackCount: stats.trackCount,
      trackFileCount: stats.trackFileCount,
      totalTrackCount: stats.totalTrackCount,
      sizeOnDisk: stats.sizeOnDisk,
    },
  };
}

function mapTrack(
  track: LidarrTrack,
  file: LidarrTrackFile | undefined,
  opts: {
    mediumCount?: number;
    country?: string;
    year?: number;
    label?: string;
    foreignArtistId?: string;
    foreignAlbumId?: string;
    foreignReleaseId?: string;
  },
): ArtistAlbumTrack {
  const hasFile = Boolean(track.hasFile && file);
  const quality = file?.quality?.quality?.name;
  return {
    id: track.id,
    trackFileId: file?.id,
    trackNumber: padTrackNumber(track.trackNumber ?? track.absoluteTrackNumber),
    absoluteTrackNumber: track.absoluteTrackNumber,
    mediumNumber: track.mediumNumber,
    mediumCount: opts.mediumCount,
    title: track.title ?? "Untitled",
    durationMs: track.duration,
    hasFile,
    quality,
    audioInfo: formatAudioInfo(file),
    status: hasFile ? quality : undefined,
    relativePath: file?.relativePath,
    path: file?.path ?? file?.relativePath,
    country: opts.country,
    year: opts.year,
    label: opts.label,
    foreignArtistId: opts.foreignArtistId ?? track.artist?.foreignArtistId,
    foreignAlbumId: opts.foreignAlbumId,
    foreignReleaseId: opts.foreignReleaseId,
    foreignRecordingId: track.foreignRecordingId,
    foreignTrackId: track.foreignTrackId,
  };
}

export function buildArtistAlbumTracksResponse(
  instance: Instance,
  artistId: number,
  album: LidarrAlbum,
  tracks: LidarrTrack[],
  files: LidarrTrackFile[],
): ArtistAlbumTracksResponse {
  if (album.artistId != null && album.artistId !== artistId) {
    throw new Error(`Album ${album.id} does not belong to artist ${artistId}`);
  }

  const release = pickRelease(album);
  const mediumCount =
    release?.media?.length ??
    (tracks.length > 0
      ? Math.max(...tracks.map((t) => t.mediumNumber ?? 1), 1)
      : undefined);
  const country = Array.isArray(release?.country)
    ? release.country[0]
    : release?.country;
  const label = Array.isArray(release?.label) ? release.label[0] : release?.label;
  const year = yearFromReleaseDate(album.releaseDate);
  const foreignArtistId = album.artist?.foreignArtistId;
  const artistName =
    album.artist?.artistName?.trim() ||
    tracks.find((t) => t.artist?.artistName)?.artist?.artistName?.trim() ||
    "Artist";

  const fileById = new Map(files.map((file) => [file.id, file]));
  const sorted = [...tracks].sort((a, b) => {
    const mediumDiff = (a.mediumNumber ?? 0) - (b.mediumNumber ?? 0);
    if (mediumDiff !== 0) return mediumDiff;
    return (a.absoluteTrackNumber ?? 0) - (b.absoluteTrackNumber ?? 0);
  });

  return {
    album: mapAlbum(instance, album),
    artistName,
    tracks: sorted.map((track) =>
      mapTrack(
        track,
        track.trackFileId != null ? fileById.get(track.trackFileId) : undefined,
        {
          mediumCount,
          country,
          year,
          label,
          foreignArtistId,
          foreignAlbumId: album.foreignAlbumId,
          foreignReleaseId: release?.foreignReleaseId,
        },
      ),
    ),
  };
}

export async function fetchArtistAlbumTracks(
  instances: Instance[],
  instanceId: string,
  artistId: number,
  albumId: number,
): Promise<ArtistAlbumTracksResponse> {
  const instance = requireLidarr(instances, instanceId);
  const [album, tracks, files] = await Promise.all([
    arrJson<LidarrAlbum>(instance, `/api/v1/album/${albumId}`),
    arrJson<LidarrTrack[]>(instance, `/api/v1/track?albumId=${albumId}`),
    arrJson<LidarrTrackFile[]>(instance, `/api/v1/trackfile?albumId=${albumId}`),
  ]);

  return buildArtistAlbumTracksResponse(instance, artistId, album, tracks, files);
}
