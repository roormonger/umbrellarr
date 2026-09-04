/**
 * Lidarr artist detail / edit / refresh / search / history / releases / files / rename.
 * Links mirror Lidarr ArtistDetailsLinks (MusicBrainz + artist.links from Arr).
 * Source: https://github.com/lidarr/Lidarr/blob/develop/frontend/src/Artist/Details/ArtistDetailsLinks.js
 */
import type {
  ArtistAlbumMonitor,
  ArtistBlocklistItem,
  ArtistDetail,
  ArtistEditOptions,
  ArtistHistoryEvent,
  ArtistHistoryEventType,
  ArtistLink,
  ArtistManageFile,
  ArtistMonitorNewItems,
  ArtistNamingConfig,
  ArtistPageDetail,
  ArtistQualityOption,
  ArtistRelease,
  ArtistReleaseGrabRequest,
  ArtistReleaseProtocol,
  ArtistRenamePreview,
  ArtistRetagPreview,
  ArtistUpdateRequest,
  Instance,
} from "@umbrellarr/shared";
import { ArtistHistoryEventTypeSchema, ArtistMonitorNewItemsSchema } from "@umbrellarr/shared";
import { arrJson } from "./client.js";
import { lidarrArtistCoverPath, pickLidarrGridImage } from "./mediaCover.js";
import { availabilityForArtist } from "./artists.js";

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
};

type LidarrArtist = {
  id: number;
  artistName?: string;
  monitored: boolean;
  monitorNewItems?: string;
  qualityProfileId: number;
  metadataProfileId: number;
  path?: string;
  tags?: number[];
  foreignArtistId?: string;
  overview?: string;
  genres?: string[];
  status?: string;
  albumTypes?: string[];
  statistics?: LidarrStatistics;
  images?: LidarrImage[];
  ratings?: { value?: number };
  links?: Array<{ name?: string; url?: string }>;
  [key: string]: unknown;
};

type QualityProfile = { id: number; name: string };
type MetadataProfile = { id: number; name: string };
type ArrTag = { id: number; label: string };
type ArrRootFolder = { id: number; path: string; freeSpace?: number | null };

type LidarrHistory = {
  id: number;
  eventType?: string;
  sourceTitle?: string;
  quality?: { quality?: { name?: string } };
  customFormats?: Array<{ name?: string }>;
  customFormatScore?: number;
  date?: string;
  downloadId?: string;
  albumId?: number;
  trackId?: number;
  data?: Record<string, unknown>;
};

type LidarrRelease = {
  guid?: string;
  protocol?: string;
  age?: number;
  ageHours?: number;
  ageMinutes?: number;
  publishDate?: string;
  title?: string;
  infoUrl?: string;
  indexerId?: number;
  indexer?: string;
  size?: number;
  seeders?: number;
  leechers?: number;
  quality?: {
    quality?: { id?: number; name?: string };
    revision?: { version?: number; real?: number; isRepack?: boolean };
  };
  customFormats?: Array<{ name?: string }>;
  customFormatScore?: number;
  indexerFlags?: number | string[];
  rejections?: Array<string | { reason?: string }>;
  approved?: boolean;
  rejected?: boolean;
  downloadAllowed?: boolean;
};

type LidarrRename = {
  artistId?: number;
  trackFileId?: number;
  existingPath?: string;
  newPath?: string;
  albumId?: number;
};

type LidarrTrackFile = {
  id: number;
  path?: string;
  relativePath?: string;
  size?: number;
  releaseGroup?: string;
  quality?: { quality?: { id?: number; name?: string } };
  albumId?: number;
};

type LidarrTrack = {
  id: number;
  trackFileId?: number;
  albumId?: number;
  mediumNumber?: number;
  absoluteTrackNumber?: number;
  trackNumber?: string | number;
};

function padTrackNumber(value: string | number | undefined): string {
  if (value == null || value === "") return "";
  const text = String(value);
  return text.length >= 2 ? text : text.padStart(2, "0");
}

type LidarrNaming = {
  renameTracks?: boolean;
  standardTrackFormat?: string;
  multiDiscTrackFormat?: string;
};

type LidarrBlocklistPage = {
  records?: Array<{ id?: number; sourceTitle?: string; date?: string; artistId?: number }>;
};

type QualitySchemaNode = {
  id?: number;
  name?: string;
  items?: QualitySchemaNode[];
  quality?: { id?: number; name?: string };
};

function requireInstance(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) throw new Error(`Instance ${instanceId} not found`);
  if (instance.kind !== "lidarr") {
    throw new Error(`Instance ${instanceId} is not a Lidarr client`);
  }
  return instance;
}

function parseMonitorNewItems(value: string | undefined): ArtistMonitorNewItems {
  const parsed = ArtistMonitorNewItemsSchema.safeParse(value);
  return parsed.success ? parsed.data : "all";
}

function posterUrlFor(instance: Instance, artist: LidarrArtist): string | undefined {
  const poster = pickLidarrGridImage(artist.images);
  if (!poster) return undefined;
  if (poster.url?.startsWith("/")) {
    const path = lidarrArtistCoverPath(artist.id, poster.url);
    return `/api/media/${encodeURIComponent(instance.id)}/image?path=${encodeURIComponent(path)}`;
  }
  return poster.remoteUrl && /^https?:\/\//i.test(poster.remoteUrl) ? poster.remoteUrl : undefined;
}

function toEditDetail(instanceId: string, artist: LidarrArtist): ArtistDetail {
  return {
    instanceId,
    externalId: artist.id,
    title: artist.artistName ?? "Unknown Artist",
    monitored: Boolean(artist.monitored),
    monitorNewItems: parseMonitorNewItems(artist.monitorNewItems),
    qualityProfileId: artist.qualityProfileId,
    metadataProfileId: artist.metadataProfileId,
    path: artist.path ?? "",
    tagIds: artist.tags ?? [],
    foreignArtistId: artist.foreignArtistId,
  };
}

export async function fetchArtistEditOptions(
  instances: Instance[],
  instanceId: string,
): Promise<ArtistEditOptions> {
  const instance = requireInstance(instances, instanceId);
  const [qualityProfiles, metadataProfiles, tags, rootFolders] = await Promise.all([
    arrJson<QualityProfile[]>(instance, "/api/v1/qualityprofile"),
    arrJson<MetadataProfile[]>(instance, "/api/v1/metadataprofile"),
    arrJson<ArrTag[]>(instance, "/api/v1/tag"),
    arrJson<ArrRootFolder[]>(instance, "/api/v1/rootfolder"),
  ]);
  return {
    qualityProfiles: qualityProfiles.map((p) => ({ id: p.id, name: p.name })),
    metadataProfiles: metadataProfiles.map((p) => ({ id: p.id, name: p.name })),
    tags: tags.map((t) => ({ id: t.id, label: t.label })),
    rootFolders: rootFolders.map((r) => ({
      id: r.id,
      path: r.path,
      ...(typeof r.freeSpace === "number" ? { freeSpace: r.freeSpace } : {}),
    })),
  };
}

export async function fetchArtistDetail(
  instances: Instance[],
  instanceId: string,
  artistId: number,
): Promise<ArtistDetail> {
  const instance = requireInstance(instances, instanceId);
  const artist = await arrJson<LidarrArtist>(instance, `/api/v1/artist/${artistId}`);
  return toEditDetail(instanceId, artist);
}

export async function fetchArtistPageDetail(
  instances: Instance[],
  instanceId: string,
  artistId: number,
): Promise<ArtistPageDetail> {
  const instance = requireInstance(instances, instanceId);
  const [artist, qualityProfiles, metadataProfiles, tags] = await Promise.all([
    arrJson<LidarrArtist>(instance, `/api/v1/artist/${artistId}`),
    arrJson<QualityProfile[]>(instance, "/api/v1/qualityprofile"),
    arrJson<MetadataProfile[]>(instance, "/api/v1/metadataprofile"),
    arrJson<ArrTag[]>(instance, "/api/v1/tag"),
  ]);
  const profileName = qualityProfiles.find((p) => p.id === artist.qualityProfileId)?.name;
  const metadataName = metadataProfiles.find((p) => p.id === artist.metadataProfileId)?.name;
  const tagLabels = (artist.tags ?? [])
    .map((id) => tags.find((t) => t.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const edit = toEditDetail(instanceId, artist);
  const stats = artist.statistics;

  return {
    ...edit,
    overview: artist.overview,
    genres: artist.genres ?? [],
    qualityProfileName: profileName,
    metadataProfileName: metadataName,
    sizeOnDisk: stats?.sizeOnDisk,
    albumCount: stats?.albumCount,
    trackCount: stats?.trackCount,
    trackFileCount: stats?.trackFileCount,
    availability: availabilityForArtist(artist),
    rating: artist.ratings?.value,
    posterUrl: posterUrlFor(instance, artist),
    status: artist.status,
    tags: tagLabels,
    albumTypes: artist.albumTypes ?? [],
  };
}

export async function refreshArtist(
  instances: Instance[],
  instanceId: string,
  artistId: number,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v1/command", {
    method: "POST",
    body: { name: "RefreshArtist", artistIds: [artistId] },
  });
}

export async function searchArtist(
  instances: Instance[],
  instanceId: string,
  artistId: number,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v1/command", {
    method: "POST",
    body: { name: "ArtistSearch", artistIds: [artistId] },
  });
}

export async function updateArtist(
  instances: Instance[],
  instanceId: string,
  artistId: number,
  body: ArtistUpdateRequest,
): Promise<ArtistDetail> {
  const instance = requireInstance(instances, instanceId);
  const current = await arrJson<LidarrArtist>(instance, `/api/v1/artist/${artistId}`);
  await arrJson(instance, `/api/v1/artist/${artistId}`, {
    method: "PUT",
    body: {
      ...current,
      monitored: body.monitored,
      monitorNewItems: body.monitorNewItems,
      qualityProfileId: body.qualityProfileId,
      metadataProfileId: body.metadataProfileId,
      path: body.path,
      tags: body.tagIds,
    },
  });
  return fetchArtistDetail(instances, instanceId, artistId);
}

export async function deleteArtist(
  instances: Instance[],
  instanceId: string,
  artistId: number,
  deleteFiles: boolean,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(
    instance,
    `/api/v1/artist/${artistId}?deleteFiles=${deleteFiles ? "true" : "false"}&addImportListExclusion=false`,
    { method: "DELETE" },
  );
}

/**
 * Mirror Lidarr ArtistDetailsLinks: MusicBrainz from foreignArtistId, then Arr `links[]`.
 * Source: https://github.com/lidarr/Lidarr/blob/develop/frontend/src/Artist/Details/ArtistDetailsLinks.js
 */
export async function buildArtistLinks(
  instances: Instance[],
  instanceId: string,
  artistId: number,
): Promise<ArtistLink[]> {
  const instance = requireInstance(instances, instanceId);
  const artist = await arrJson<LidarrArtist>(instance, `/api/v1/artist/${artistId}`);
  const links: ArtistLink[] = [];

  if (artist.foreignArtistId) {
    links.push({
      id: "musicbrainz",
      label: "MusicBrainz",
      url: `https://musicbrainz.org/artist/${artist.foreignArtistId}`,
    });
  }

  for (const [index, link] of (artist.links ?? []).entries()) {
    if (!link?.name || !link.url) continue;
    try {
      new URL(link.url);
      links.push({
        id: `arr-${index}-${link.name.toLowerCase().replace(/\s+/g, "-")}`,
        label: link.name,
        url: link.url,
      });
    } catch {
      // ignore invalid
    }
  }

  return links;
}

function mapHistoryEventType(value?: string): ArtistHistoryEventType {
  const parsed = ArtistHistoryEventTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : "unknown";
}

function stringifyData(data?: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data) return out;
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue;
    out[key] = typeof value === "string" ? value : String(value);
  }
  return out;
}

export async function fetchArtistHistory(
  instances: Instance[],
  instanceId: string,
  artistId: number,
): Promise<ArtistHistoryEvent[]> {
  const instance = requireInstance(instances, instanceId);
  const events = await arrJson<LidarrHistory[]>(
    instance,
    `/api/v1/history/artist?artistId=${artistId}&includeTrack=true`,
  );
  return events.map((event) => ({
    id: event.id,
    eventType: mapHistoryEventType(event.eventType),
    sourceTitle: event.sourceTitle ?? "",
    quality: event.quality?.quality?.name,
    customFormats: (event.customFormats ?? [])
      .map((f) => f.name)
      .filter((name): name is string => Boolean(name)),
    customFormatScore: event.customFormatScore,
    date: event.date ?? "",
    downloadId: event.downloadId,
    albumId: event.albumId,
    trackId: event.trackId,
    data: stringifyData(event.data),
  }));
}

export async function markArtistHistoryFailed(
  instances: Instance[],
  instanceId: string,
  historyId: number,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, `/api/v1/history/failed/${historyId}`, { method: "POST" });
}

function mapProtocol(value?: string): ArtistReleaseProtocol {
  if (value === "torrent" || value === "usenet") return value;
  return "unknown";
}

function mapRelease(release: LidarrRelease): ArtistRelease | null {
  if (!release.guid || release.indexerId == null) return null;
  const rejections = (release.rejections ?? []).map((r) =>
    typeof r === "string" ? r : (r.reason ?? "Rejected"),
  );
  const flags = Array.isArray(release.indexerFlags)
    ? release.indexerFlags.map(String)
    : release.indexerFlags != null
      ? [String(release.indexerFlags)]
      : [];
  return {
    guid: release.guid,
    protocol: mapProtocol(release.protocol),
    age: release.age ?? 0,
    ageHours: release.ageHours ?? 0,
    ageMinutes: release.ageMinutes ?? 0,
    publishDate: release.publishDate,
    title: release.title ?? "",
    infoUrl: release.infoUrl,
    indexerId: release.indexerId,
    indexer: release.indexer ?? "",
    size: release.size,
    seeders: release.seeders,
    leechers: release.leechers,
    quality:
      release.quality?.quality?.id != null
        ? {
            quality: {
              id: release.quality.quality.id,
              name: release.quality.quality.name ?? "",
            },
            revision: {
              version: release.quality.revision?.version ?? 1,
              real: release.quality.revision?.real ?? 0,
              isRepack: Boolean(release.quality.revision?.isRepack),
            },
          }
        : undefined,
    qualityName: release.quality?.quality?.name,
    customFormats: (release.customFormats ?? [])
      .map((f) => f.name)
      .filter((name): name is string => Boolean(name)),
    customFormatScore: release.customFormatScore ?? 0,
    indexerFlags: flags,
    rejections,
    approved: Boolean(release.approved),
    rejected: Boolean(release.rejected),
    downloadAllowed: Boolean(release.downloadAllowed),
  };
}

export async function fetchArtistReleases(
  instances: Instance[],
  instanceId: string,
  artistId: number,
  albumId?: number,
): Promise<ArtistRelease[]> {
  const instance = requireInstance(instances, instanceId);
  const query =
    albumId != null && Number.isFinite(albumId)
      ? `albumId=${albumId}`
      : `artistId=${artistId}`;
  const releases = await arrJson<LidarrRelease[]>(
    instance,
    `/api/v1/release?${query}`,
    { timeoutMs: 120_000 },
  );
  return releases.map(mapRelease).filter((r): r is ArtistRelease => r != null);
}

export async function grabArtistRelease(
  instances: Instance[],
  instanceId: string,
  body: ArtistReleaseGrabRequest,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  const payload: Record<string, unknown> = {
    guid: body.guid,
    indexerId: body.indexerId,
  };
  if (body.artistId != null) payload.artistId = body.artistId;
  if (body.shouldOverride) {
    payload.shouldOverride = true;
    if (body.quality) payload.quality = body.quality;
  }
  await arrJson(instance, "/api/v1/release", {
    method: "POST",
    body: payload,
    timeoutMs: 120_000,
  });
}

export async function fetchArtistBlocklist(
  instances: Instance[],
  instanceId: string,
  artistId: number,
): Promise<ArtistBlocklistItem[]> {
  const instance = requireInstance(instances, instanceId);
  const page = await arrJson<LidarrBlocklistPage>(
    instance,
    "/api/v1/blocklist?page=1&pageSize=100",
  );
  return (page.records ?? [])
    .filter((r) => r.artistId == null || r.artistId === artistId)
    .filter((r) => r.id != null && r.sourceTitle && r.date)
    .map((r) => ({
      id: r.id as number,
      sourceTitle: r.sourceTitle as string,
      date: r.date as string,
    }));
}

export async function fetchArtistNamingConfig(
  instances: Instance[],
  instanceId: string,
): Promise<ArtistNamingConfig> {
  const instance = requireInstance(instances, instanceId);
  const naming = await arrJson<LidarrNaming>(instance, "/api/v1/config/naming");
  return {
    renameTracks: Boolean(naming.renameTracks),
    standardTrackFormat: naming.standardTrackFormat ?? "",
    multiDiscTrackFormat: naming.multiDiscTrackFormat,
  };
}

export async function fetchArtistRenamePreview(
  instances: Instance[],
  instanceId: string,
  artistId: number,
): Promise<ArtistRenamePreview[]> {
  const instance = requireInstance(instances, instanceId);
  const items = await arrJson<LidarrRename[]>(
    instance,
    `/api/v1/rename?artistId=${artistId}`,
  );
  return items
    .filter((item) => item.trackFileId != null && item.existingPath && item.newPath)
    .map((item) => ({
      artistId: item.artistId ?? artistId,
      trackFileId: item.trackFileId as number,
      existingPath: item.existingPath as string,
      newPath: item.newPath as string,
      albumId: item.albumId,
    }));
}

export async function organizeArtistFiles(
  instances: Instance[],
  instanceId: string,
  artistId: number,
  files: number[],
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v1/command", {
    method: "POST",
    body: { name: "RenameFiles", artistId, files },
  });
}

type LidarrTagChange = {
  field?: string;
  oldValue?: string | number | null;
  newValue?: string | number | null;
};

type LidarrRetag = {
  id?: number;
  trackFileId?: number;
  path?: string;
  albumId?: number;
  changes?: LidarrTagChange[];
};

function stringifyTagValue(value: string | number | null | undefined): string | undefined {
  if (value == null) return undefined;
  return String(value);
}

export async function fetchArtistRetagPreview(
  instances: Instance[],
  instanceId: string,
  artistId: number,
): Promise<ArtistRetagPreview[]> {
  const instance = requireInstance(instances, instanceId);
  const items = await arrJson<LidarrRetag[]>(instance, `/api/v1/retag?artistId=${artistId}`);
  const out: ArtistRetagPreview[] = [];
  for (const item of items) {
    const trackFileId = item.trackFileId ?? item.id;
    if (trackFileId == null || !item.path) continue;
    out.push({
      trackFileId,
      path: item.path,
      albumId: item.albumId,
      changes: (item.changes ?? [])
        .filter((change): change is LidarrTagChange & { field: string } => Boolean(change.field))
        .map((change) => ({
          field: change.field,
          oldValue: stringifyTagValue(change.oldValue),
          newValue: stringifyTagValue(change.newValue),
        })),
    });
  }
  return out;
}

export async function retagArtistFiles(
  instances: Instance[],
  instanceId: string,
  artistId: number,
  files: number[],
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v1/command", {
    method: "POST",
    body: { name: "RetagFiles", artistId, files },
  });
}

/** Lidarr Artist Monitoring — POST /albumStudio (ArtistDetails MonitoringOptionsModal). */
export async function updateArtistAlbumMonitoring(
  instances: Instance[],
  instanceId: string,
  artistId: number,
  monitor: ArtistAlbumMonitor,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v1/albumStudio", {
    method: "POST",
    body: {
      artist: [{ id: artistId }],
      monitoringOptions: { monitor },
    },
  });
}

function flattenQualities(nodes: QualitySchemaNode[] | undefined, out: ArtistQualityOption[] = []) {
  if (!Array.isArray(nodes)) return out;
  for (const node of nodes) {
    if (node.quality?.id != null && node.quality.name) {
      out.push({ id: node.quality.id, name: node.quality.name });
    }
    if (node.items?.length) flattenQualities(node.items, out);
  }
  return out;
}

export async function fetchArtistQualities(
  instances: Instance[],
  instanceId: string,
): Promise<ArtistQualityOption[]> {
  const instance = requireInstance(instances, instanceId);
  // Lidarr, like Radarr, returns a QualityProfile template, not an array.
  const schema = await arrJson<QualitySchemaNode | QualitySchemaNode[]>(
    instance,
    "/api/v1/qualityprofile/schema",
  );
  const roots = Array.isArray(schema) ? schema : (schema.items ?? []);
  const seen = new Set<number>();
  return flattenQualities(roots).filter((q) => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });
}

export async function fetchArtistManageFiles(
  instances: Instance[],
  instanceId: string,
  artistId: number,
): Promise<ArtistManageFile[]> {
  const instance = requireInstance(instances, instanceId);
  const [files, tracks] = await Promise.all([
    arrJson<LidarrTrackFile[]>(instance, `/api/v1/trackfile?artistId=${artistId}`),
    arrJson<LidarrTrack[]>(instance, `/api/v1/track?artistId=${artistId}`),
  ]);
  const fileById = new Map(files.map((file) => [file.id, file]));

  // Mirror Lidarr TrackFileEditorModalContentConnector: tracks with files,
  // ordered by album (desc), medium, absolute track number.
  const linked = tracks
    .filter((track) => track.trackFileId != null && fileById.has(track.trackFileId))
    .sort((a, b) => {
      const albumDiff = (b.albumId ?? 0) - (a.albumId ?? 0);
      if (albumDiff !== 0) return albumDiff;
      const mediumDiff = (a.mediumNumber ?? 0) - (b.mediumNumber ?? 0);
      if (mediumDiff !== 0) return mediumDiff;
      return (a.absoluteTrackNumber ?? 0) - (b.absoluteTrackNumber ?? 0);
    });

  return linked.map((track) => {
    const file = fileById.get(track.trackFileId!)!;
    return {
      id: track.id,
      trackFileId: file.id,
      trackNumber: padTrackNumber(track.trackNumber ?? track.absoluteTrackNumber),
      relativePath: file.relativePath ?? file.path ?? "",
      quality: file.quality?.quality?.name,
      qualityId: file.quality?.quality?.id,
      albumId: track.albumId ?? file.albumId,
    };
  });
}

export async function bulkUpdateArtistFiles(
  instances: Instance[],
  instanceId: string,
  body: {
    trackFileIds: number[];
    quality?: ArtistReleaseGrabRequest["quality"];
    releaseGroup?: string;
  },
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  const payload: Record<string, unknown> = { trackFileIds: body.trackFileIds };
  if (body.quality) payload.quality = body.quality;
  if (body.releaseGroup != null) payload.releaseGroup = body.releaseGroup;
  await arrJson(instance, "/api/v1/trackfile/editor", {
    method: "PUT",
    body: payload,
  });
}

export async function bulkDeleteArtistFiles(
  instances: Instance[],
  instanceId: string,
  trackFileIds: number[],
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v1/trackfile/bulk", {
    method: "DELETE",
    body: { trackFileIds },
  });
}
