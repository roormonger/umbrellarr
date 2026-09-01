import {
  SeriesHistoryEventTypeSchema,
  SeriesMonitorNewItemsSchema,
  SeriesReleaseProtocolSchema,
  SeriesTypeSchema,
  type Availability,
  type Instance,
  type SeriesAddRequest,
  type SeriesBlocklistItem,
  type SeriesDetail,
  type SeriesEditOptions,
  type SeriesFileBulkUpdateItem,
  type SeriesHistoryEvent,
  type SeriesHistoryEventType,
  type SeriesIndexerFlagOption,
  type SeriesLanguageOption,
  type SeriesLink,
  type SeriesLookupItem,
  type SeriesManageFile,
  type SeriesMonitorNewItems,
  type SeriesNamingConfig,
  type SeriesPageDetail,
  type SeriesQualityOption,
  type SeriesRelease,
  type SeriesReleaseGrabRequest,
  type SeriesReleaseLanguage,
  type SeriesReleaseQuality,
  type SeriesRenamePreview,
  type SeriesType,
  type SeriesUpdateRequest,
} from "@umbrellarr/shared";
import { arrJson } from "./client.js";
import { toGridPosterPath } from "./mediaCover.js";
import { resolveSeriesRatings } from "./seriesRatings.js";
import { resolveSeriesYouTubeTrailerId } from "./seriesTrailer.js";
import { availabilityFor } from "./shows.js";

type SonarrImage = {
  coverType?: string;
  url?: string;
  remoteUrl?: string;
};

type SonarrStatistics = {
  seasonCount?: number;
  episodeCount?: number;
  episodeFileCount?: number;
  sizeOnDisk?: number;
};

type SonarrSeries = {
  id: number;
  title: string;
  sortTitle?: string;
  year?: number;
  overview?: string;
  runtime?: number;
  monitored: boolean;
  monitorNewItems?: string;
  seriesType?: string;
  seasonFolder?: boolean;
  status?: string;
  network?: string;
  qualityProfileId: number;
  path?: string;
  certification?: string;
  genres?: string[];
  /** Suggested folder name from lookup. */
  folder?: string;
  tags?: number[];
  tvdbId?: number;
  tvMazeId?: number;
  tmdbId?: number;
  imdbId?: string;
  youTubeTrailerId?: string;
  nextAiring?: string;
  previousAiring?: string;
  originalLanguage?: { id?: number; name?: string };
  ratings?: {
    imdb?: { value?: number };
    tmdb?: { value?: number };
    trakt?: { value?: number };
  };
  statistics?: SonarrStatistics;
  images?: SonarrImage[];
  seasons?: unknown[];
  [key: string]: unknown;
};

type QualityProfile = { id: number; name: string };
type ArrTag = { id: number; label: string };
type ArrRootFolder = { id: number; path: string; freeSpace?: number | null };

type SonarrEpisodeFile = {
  id: number;
  seasonNumber?: number;
  relativePath?: string;
  size?: number;
  releaseGroup?: string;
  customFormatScore?: number;
  indexerFlags?: number;
  languages?: Array<{ id?: number; name?: string }>;
  quality?: {
    quality?: {
      id?: number;
      name?: string;
      source?: string;
      resolution?: number;
      modifier?: string;
    };
    revision?: { version?: number; real?: number; isRepack?: boolean };
  };
  customFormats?: Array<{ name?: string }>;
};

type SonarrQualitySchemaItem = {
  quality?: {
    id?: number;
    name?: string;
    source?: string;
    resolution?: number;
    modifier?: string;
  };
  items?: SonarrQualitySchemaItem[];
};

type SonarrHistory = {
  id: number;
  sourceTitle?: string;
  eventType?: string;
  date?: string;
  downloadId?: string;
  customFormatScore?: number;
  languages?: Array<{ name?: string }>;
  quality?: { quality?: { name?: string } };
  customFormats?: Array<{ name?: string }>;
  data?: Record<string, string | null | undefined>;
  episode?: { id?: number; seasonNumber?: number };
  episodeId?: number;
};

type SonarrRelease = {
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
    quality?: {
      id?: number;
      name?: string;
      source?: string;
      resolution?: number;
      modifier?: string;
    };
    revision?: { version?: number; real?: number; isRepack?: boolean };
  };
  languages?: Array<{ id?: number; name?: string }>;
  customFormats?: Array<{ name?: string }>;
  customFormatScore?: number;
  indexerFlags?: string[] | number;
  rejections?: string[];
  approved?: boolean;
  rejected?: boolean;
  downloadAllowed?: boolean;
};

type SonarrBlocklist = {
  id: number;
  sourceTitle?: string;
  date?: string;
};

type SonarrBlocklistPage = {
  records?: SonarrBlocklist[];
};

type SonarrRenamePreview = {
  seriesId?: number;
  episodeFileId?: number;
  seasonNumber?: number;
  existingPath?: string;
  newPath?: string;
};

type SonarrNamingConfig = {
  renameEpisodes?: boolean;
  standardEpisodeFormat?: string;
  dailyEpisodeFormat?: string;
  animeEpisodeFormat?: string;
};

function mapReleaseQuality(raw: SonarrRelease["quality"]): SeriesReleaseQuality | undefined {
  const q = raw?.quality;
  if (q?.id == null || !q.name) return undefined;
  return {
    quality: {
      id: q.id,
      name: q.name,
      source: q.source,
      resolution: q.resolution,
      modifier: q.modifier,
    },
    revision: {
      version: raw?.revision?.version ?? 1,
      real: raw?.revision?.real ?? 0,
      isRepack: raw?.revision?.isRepack ?? false,
    },
  };
}

function mapReleaseLanguages(
  languages: SonarrRelease["languages"],
): SeriesReleaseLanguage[] {
  return (languages ?? [])
    .filter((l): l is { id: number; name: string } => l.id != null && Boolean(l.name))
    .map((l) => ({ id: l.id, name: l.name }));
}

function mapIndexerFlags(flags: SonarrRelease["indexerFlags"]): string[] {
  if (Array.isArray(flags)) {
    return flags.map(String).filter(Boolean);
  }
  return [];
}

function toSeriesRelease(record: SonarrRelease): SeriesRelease | null {
  if (!record.guid || record.indexerId == null) return null;
  const protocolParsed = SeriesReleaseProtocolSchema.safeParse(record.protocol);
  const quality = mapReleaseQuality(record.quality);
  return {
    guid: record.guid,
    protocol: protocolParsed.success ? protocolParsed.data : "unknown",
    age: record.age ?? 0,
    ageHours: record.ageHours ?? 0,
    ageMinutes: record.ageMinutes ?? 0,
    publishDate: record.publishDate,
    title: record.title ?? "",
    infoUrl: record.infoUrl || undefined,
    indexerId: record.indexerId,
    indexer: record.indexer ?? "",
    size: record.size,
    seeders: record.seeders,
    leechers: record.leechers,
    quality,
    qualityName: quality?.quality.name,
    languages: mapReleaseLanguages(record.languages),
    customFormats: (record.customFormats ?? [])
      .map((f) => f.name)
      .filter((n): n is string => Boolean(n)),
    customFormatScore: record.customFormatScore ?? 0,
    indexerFlags: mapIndexerFlags(record.indexerFlags),
    rejections: record.rejections ?? [],
    approved: Boolean(record.approved),
    rejected: Boolean(record.rejected) || (record.rejections?.length ?? 0) > 0,
    downloadAllowed: Boolean(record.downloadAllowed),
  };
}

function parseHistoryEventType(value: string | undefined): SeriesHistoryEventType {
  const parsed = SeriesHistoryEventTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : "unknown";
}

function mapManageFileQuality(file: SonarrEpisodeFile): SeriesReleaseQuality | undefined {
  const q = file.quality?.quality;
  if (q?.id == null || !q.name) return undefined;
  return {
    quality: {
      id: q.id,
      name: q.name,
      source: q.source,
      resolution: q.resolution,
      modifier: q.modifier,
    },
    revision: {
      version: file.quality?.revision?.version ?? 1,
      real: file.quality?.revision?.real ?? 0,
      isRepack: file.quality?.revision?.isRepack ?? false,
    },
  };
}

function mapManageFile(file: SonarrEpisodeFile): SeriesManageFile {
  return {
    id: file.id,
    relativePath: file.relativePath ?? "",
    size: file.size,
    releaseGroup: file.releaseGroup,
    quality: mapManageFileQuality(file),
    languages: (file.languages ?? [])
      .filter((l): l is { id: number; name: string } => l.id != null && Boolean(l.name))
      .map((l) => ({ id: l.id, name: l.name })),
    indexerFlags: file.indexerFlags ?? 0,
    customFormatScore: file.customFormatScore,
    seasonNumber: file.seasonNumber,
  };
}

function flattenQualitySchema(items: SonarrQualitySchemaItem[]): SeriesQualityOption[] {
  const out: SeriesQualityOption[] = [];
  const seen = new Set<number>();

  const walk = (nodes: unknown) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes as SonarrQualitySchemaItem[]) {
      const q = node.quality;
      if (q?.id != null && q.name && !seen.has(q.id)) {
        seen.add(q.id);
        out.push({
          id: q.id,
          name: q.name,
          source: q.source,
          resolution: q.resolution,
          modifier: q.modifier,
        });
      }
      if (node.items?.length) walk(node.items);
    }
  };

  walk(items);
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function requireInstance(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId && i.kind === "sonarr");
  if (!instance) {
    throw new Error(`Sonarr instance not found: ${instanceId}`);
  }
  return instance;
}

function parseSeriesType(value: string | undefined): SeriesType {
  const parsed = SeriesTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : "standard";
}

function parseMonitorNewItems(value: string | undefined): SeriesMonitorNewItems {
  const parsed = SeriesMonitorNewItemsSchema.safeParse(value);
  return parsed.success ? parsed.data : "all";
}

function seriesAvailability(series: SonarrSeries): Availability {
  return availabilityFor(series);
}

function mediaCoverUrl(instance: Instance, image: SonarrImage | undefined): string | undefined {
  if (!image) return undefined;
  if (image.url?.startsWith("/")) {
    const raw = image.url.split("?")[0] ?? image.url;
    const path = image.coverType === "poster" ? toGridPosterPath(raw) : raw;
    return `/api/media/${encodeURIComponent(instance.id)}/image?path=${encodeURIComponent(path)}`;
  }
  return image.remoteUrl ?? undefined;
}

function mapLookupItem(instance: Instance, series: SonarrSeries & { tvdbId: number }): SeriesLookupItem {
  const poster = series.images?.find((img) => img.coverType === "poster");
  const inLibrary = typeof series.id === "number" && series.id > 0;
  return {
    tvdbId: series.tvdbId,
    tmdbId: series.tmdbId,
    title: series.title,
    year: series.year,
    overview: series.overview,
    network: series.network,
    runtime: series.runtime,
    certification: series.certification,
    genres: series.genres ?? [],
    seriesType: SeriesTypeSchema.safeParse(series.seriesType).success
      ? parseSeriesType(series.seriesType)
      : undefined,
    posterUrl: mediaCoverUrl(instance, poster),
    tmdbRating: series.ratings?.tmdb?.value,
    imdbRating: series.ratings?.imdb?.value,
    traktRating: series.ratings?.trakt?.value,
    folder: series.folder,
    inLibrary,
    ...(inLibrary ? { externalId: series.id } : {}),
  };
}

function toEditDetail(instanceId: string, series: SonarrSeries): SeriesDetail {
  return {
    instanceId,
    externalId: series.id,
    title: series.title,
    year: series.year,
    monitored: series.monitored,
    monitorNewItems: parseMonitorNewItems(series.monitorNewItems),
    seriesType: parseSeriesType(series.seriesType),
    seasonFolder: Boolean(series.seasonFolder),
    qualityProfileId: series.qualityProfileId,
    path: series.path ?? "",
    tagIds: series.tags ?? [],
    tmdbId: series.tmdbId,
    tvdbId: series.tvdbId,
    tvMazeId: series.tvMazeId,
    imdbId: series.imdbId,
    youTubeTrailerId: series.youTubeTrailerId,
  };
}

export async function fetchSeriesEditOptions(
  instances: Instance[],
  instanceId: string,
): Promise<SeriesEditOptions> {
  const instance = requireInstance(instances, instanceId);
  const [qualityProfiles, tags, rootFolders] = await Promise.all([
    arrJson<QualityProfile[]>(instance, "/api/v3/qualityprofile"),
    arrJson<ArrTag[]>(instance, "/api/v3/tag"),
    arrJson<ArrRootFolder[]>(instance, "/api/v3/rootfolder"),
  ]);
  return {
    qualityProfiles: qualityProfiles.map((p) => ({ id: p.id, name: p.name })),
    tags: tags.map((t) => ({ id: t.id, label: t.label })),
    rootFolders: rootFolders.map((r) => ({
      id: r.id,
      path: r.path,
      ...(typeof r.freeSpace === "number" ? { freeSpace: r.freeSpace } : {}),
    })),
  };
}

export async function fetchSeriesDetail(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
): Promise<SeriesPageDetail> {
  const instance = requireInstance(instances, instanceId);
  const [series, profiles] = await Promise.all([
    arrJson<SonarrSeries>(instance, `/api/v3/series/${seriesId}`),
    arrJson<QualityProfile[]>(instance, "/api/v3/qualityprofile").catch(() => [] as QualityProfile[]),
  ]);

  const profileName = profiles.find((p) => p.id === series.qualityProfileId)?.name;
  const poster = series.images?.find((img) => img.coverType === "poster");
  const fanart = series.images?.find((img) => img.coverType === "fanart");
  const stats = series.statistics;
  const edit = toEditDetail(instanceId, series);

  return {
    ...edit,
    overview: series.overview,
    runtime: series.runtime,
    genres: series.genres ?? [],
    network: series.network,
    certification: series.certification,
    originalLanguage: series.originalLanguage?.name,
    qualityProfileName: profileName,
    sizeOnDisk: stats?.sizeOnDisk,
    seasonCount: stats?.seasonCount,
    episodeCount: stats?.episodeCount,
    episodeFileCount: stats?.episodeFileCount,
    availability: seriesAvailability(series),
    tmdbRating: series.ratings?.tmdb?.value,
    imdbRating: series.ratings?.imdb?.value,
    traktRating: series.ratings?.trakt?.value,
    posterUrl: mediaCoverUrl(instance, poster),
    fanartUrl: mediaCoverUrl(instance, fanart),
    nextAiring: series.nextAiring,
    previousAiring: series.previousAiring,
    status: series.status,
  };
}

/**
 * Resolve a YouTube trailer for a series. Sonarr rarely/never stores one;
 * we scrape Sonarr’s linked external pages (TMDb → IMDb → TV Maze) when needed.
 */
export async function fetchSeriesTrailer(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
): Promise<{ youTubeTrailerId?: string }> {
  const detail = await fetchSeriesDetail(instances, instanceId, seriesId);
  const youTubeTrailerId = await resolveSeriesYouTubeTrailerId(
    {
      tmdbId: detail.tmdbId,
      imdbId: detail.imdbId,
      tvMazeId: detail.tvMazeId,
    },
    detail.youTubeTrailerId,
  );
  return youTubeTrailerId ? { youTubeTrailerId } : {};
}

/**
 * Resolve TMDb/IMDb ratings for a series. Prefer Sonarr values; scrape gaps
 * from Sonarr-linked TMDb / IMDb pages.
 */
export async function fetchSeriesRatings(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
): Promise<{ tmdbRating?: number; imdbRating?: number }> {
  const detail = await fetchSeriesDetail(instances, instanceId, seriesId);
  return resolveSeriesRatings(
    { tmdbId: detail.tmdbId, imdbId: detail.imdbId },
    { tmdbRating: detail.tmdbRating, imdbRating: detail.imdbRating },
  );
}

export async function refreshSeries(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v3/command", {
    method: "POST",
    body: { name: "RefreshSeries", seriesId },
  });
}

export async function searchSeries(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v3/command", {
    method: "POST",
    body: { name: "SeriesSearch", seriesId },
  });
}

export async function fetchSeriesHistory(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
): Promise<SeriesHistoryEvent[]> {
  const instance = requireInstance(instances, instanceId);
  const records = await arrJson<SonarrHistory[]>(
    instance,
    `/api/v3/history/series?seriesId=${seriesId}&includeEpisode=true`,
  );

  return records
    .map((record): SeriesHistoryEvent => {
      const data: Record<string, string> = {};
      for (const [key, value] of Object.entries(record.data ?? {})) {
        if (value != null && value !== "") data[key] = value;
      }
      return {
        id: record.id,
        eventType: parseHistoryEventType(record.eventType),
        sourceTitle: record.sourceTitle ?? "",
        languages: (record.languages ?? [])
          .map((l) => l.name)
          .filter((n): n is string => Boolean(n)),
        quality: record.quality?.quality?.name,
        customFormats: (record.customFormats ?? [])
          .map((f) => f.name)
          .filter((n): n is string => Boolean(n)),
        customFormatScore: record.customFormatScore,
        date: record.date ?? "",
        downloadId: record.downloadId || undefined,
        seasonNumber: record.episode?.seasonNumber,
        episodeId: record.episode?.id ?? record.episodeId,
        data,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Sonarr: POST /api/v3/history/failed/{id} — mark a grabbed history item as failed. */
export async function markSeriesHistoryFailed(
  instances: Instance[],
  instanceId: string,
  historyId: number,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, `/api/v3/history/failed/${historyId}`, {
    method: "POST",
  });
}

/** Interactive search — long-running; queries all interactive indexers. */
export async function fetchSeriesReleases(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
): Promise<SeriesRelease[]> {
  const instance = requireInstance(instances, instanceId);
  const records = await arrJson<SonarrRelease[]>(
    instance,
    `/api/v3/release?seriesId=${seriesId}`,
    { timeoutMs: 120_000 },
  );
  return records
    .map(toSeriesRelease)
    .filter((r): r is SeriesRelease => r != null);
}

export async function grabSeriesRelease(
  instances: Instance[],
  instanceId: string,
  request: SeriesReleaseGrabRequest,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  const body: Record<string, unknown> = {
    guid: request.guid,
    indexerId: request.indexerId,
  };
  if (request.seriesId != null) body.seriesId = request.seriesId;
  if (request.shouldOverride) {
    if (request.seriesId == null || !request.quality || !request.languages) {
      throw new Error("Override grab requires seriesId, quality, and languages");
    }
    body.shouldOverride = true;
    body.quality = request.quality;
    body.languages = request.languages;
  }
  await arrJson(instance, "/api/v3/release", {
    method: "POST",
    body,
    timeoutMs: 60_000,
  });
}

export async function fetchSeriesBlocklist(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
): Promise<SeriesBlocklistItem[]> {
  const instance = requireInstance(instances, instanceId);
  const result = await arrJson<SonarrBlocklistPage | SonarrBlocklist[]>(
    instance,
    `/api/v3/blocklist?seriesIds=${seriesId}&pageSize=100`,
  );
  const records = Array.isArray(result) ? result : (result.records ?? []);
  return records.map((record) => ({
    id: record.id,
    sourceTitle: record.sourceTitle ?? "",
    date: record.date ?? "",
  }));
}

export async function fetchSeriesRenamePreview(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
): Promise<SeriesRenamePreview[]> {
  const instance = requireInstance(instances, instanceId);
  const records = await arrJson<SonarrRenamePreview[]>(
    instance,
    `/api/v3/rename?seriesId=${seriesId}`,
  );
  return records
    .filter(
      (r): r is SonarrRenamePreview & { seriesId: number; episodeFileId: number } =>
        r.seriesId != null && r.episodeFileId != null,
    )
    .map((r) => ({
      seriesId: r.seriesId,
      episodeFileId: r.episodeFileId,
      existingPath: r.existingPath ?? "",
      newPath: r.newPath ?? "",
      seasonNumber: r.seasonNumber,
    }));
}

export async function fetchSeriesNamingConfig(
  instances: Instance[],
  instanceId: string,
): Promise<SeriesNamingConfig> {
  const instance = requireInstance(instances, instanceId);
  const config = await arrJson<SonarrNamingConfig>(instance, "/api/v3/config/naming");
  return {
    renameEpisodes: Boolean(config.renameEpisodes),
    standardEpisodeFormat: config.standardEpisodeFormat ?? "",
    dailyEpisodeFormat: config.dailyEpisodeFormat ?? "",
    animeEpisodeFormat: config.animeEpisodeFormat ?? "",
  };
}

/** Detail-modal organize: RenameFiles for selected episode file IDs. */
export async function organizeSeriesFiles(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
  files: number[],
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  if (files.length === 0) {
    throw new Error("No files selected to organize");
  }
  await arrJson(instance, "/api/v3/command", {
    method: "POST",
    body: { name: "RenameFiles", seriesId, files },
  });
}

export async function fetchSeriesManageFiles(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
): Promise<SeriesManageFile[]> {
  const instance = requireInstance(instances, instanceId);
  const files = await arrJson<SonarrEpisodeFile[]>(
    instance,
    `/api/v3/episodefile?seriesId=${seriesId}`,
  );
  return files.map(mapManageFile);
}

export async function fetchSeriesQualities(
  instances: Instance[],
  instanceId: string,
): Promise<SeriesQualityOption[]> {
  const instance = requireInstance(instances, instanceId);
  const schema = await arrJson<{ items?: SonarrQualitySchemaItem[] }>(
    instance,
    "/api/v3/qualityprofile/schema",
  );
  return flattenQualitySchema(schema.items ?? []);
}

export async function fetchSeriesLanguages(
  instances: Instance[],
  instanceId: string,
): Promise<SeriesLanguageOption[]> {
  const instance = requireInstance(instances, instanceId);
  const languages = await arrJson<Array<{ id?: number; name?: string }>>(
    instance,
    "/api/v3/language",
  );
  return languages
    .filter(
      (l): l is { id: number; name: string } =>
        l.id != null &&
        Boolean(l.name) &&
        l.id !== -1 &&
        l.id !== -2 &&
        l.name !== "Any" &&
        l.name !== "Original",
    )
    .map((l) => ({ id: l.id, name: l.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchSeriesIndexerFlags(
  instances: Instance[],
  instanceId: string,
): Promise<SeriesIndexerFlagOption[]> {
  const instance = requireInstance(instances, instanceId);
  const flags = await arrJson<Array<{ id?: number; name?: string }>>(
    instance,
    "/api/v3/indexerFlag",
  );
  return flags
    .filter((f): f is { id: number; name: string } => f.id != null && Boolean(f.name))
    .map((f) => ({ id: f.id, name: f.name }));
}

export async function bulkUpdateSeriesFiles(
  instances: Instance[],
  instanceId: string,
  files: SeriesFileBulkUpdateItem[],
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v3/episodefile/bulk", {
    method: "PUT",
    body: files.map((f) => ({
      id: f.id,
      quality: f.quality,
      languages: f.languages,
      releaseGroup: f.releaseGroup ?? "",
      indexerFlags: f.indexerFlags,
    })),
  });
}

export async function bulkDeleteSeriesFiles(
  instances: Instance[],
  instanceId: string,
  episodeFileIds: number[],
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v3/episodefile/bulk", {
    method: "DELETE",
    body: { episodeFileIds },
  });
}

export async function updateSeries(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
  patch: SeriesUpdateRequest,
): Promise<SeriesDetail> {
  const instance = requireInstance(instances, instanceId);
  const current = await arrJson<SonarrSeries>(instance, `/api/v3/series/${seriesId}`);
  const next: SonarrSeries = {
    ...current,
    monitored: patch.monitored,
    monitorNewItems: patch.monitorNewItems,
    seriesType: patch.seriesType,
    seasonFolder: patch.seasonFolder,
    qualityProfileId: patch.qualityProfileId,
    path: patch.path,
    tags: patch.tagIds,
  };
  const saved = await arrJson<SonarrSeries>(instance, `/api/v3/series/${seriesId}`, {
    method: "PUT",
    body: next,
  });
  return toEditDetail(instanceId, saved);
}

export async function deleteSeries(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
  deleteFiles = false,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(
    instance,
    `/api/v3/series/${seriesId}?deleteFiles=${deleteFiles ? "true" : "false"}&addImportListExclusion=false`,
    { method: "DELETE" },
  );
}

export async function lookupSeries(
  instances: Instance[],
  instanceId: string,
  term: string,
): Promise<SeriesLookupItem[]> {
  const instance = requireInstance(instances, instanceId);
  const trimmed = term.trim();
  if (!trimmed) return [];
  const results = await arrJson<SonarrSeries[]>(
    instance,
    `/api/v3/series/lookup?term=${encodeURIComponent(trimmed)}`,
    { timeoutMs: 20_000 },
  );
  return results
    .filter((series): series is SonarrSeries & { tvdbId: number } =>
      typeof series.tvdbId === "number" && series.tvdbId > 0,
    )
    .map((series) => mapLookupItem(instance, series));
}

export async function addSeries(
  instances: Instance[],
  instanceId: string,
  request: SeriesAddRequest,
): Promise<SeriesDetail> {
  const instance = requireInstance(instances, instanceId);
  const lookup = await arrJson<SonarrSeries[]>(
    instance,
    `/api/v3/series/lookup?term=${encodeURIComponent(`tvdb:${request.tvdbId}`)}`,
    { timeoutMs: 20_000 },
  );
  const seed = lookup.find((series) => series.tvdbId === request.tvdbId) ?? lookup[0];
  if (!seed) {
    throw new Error(`Series not found for TVDB ${request.tvdbId}`);
  }
  if (typeof seed.id === "number" && seed.id > 0) {
    const err = new Error("Series is already in the library") as Error & { existingId?: number };
    err.existingId = seed.id;
    throw err;
  }

  const { id: _ignoredId, ...withoutId } = seed;
  void _ignoredId;
  const monitored = request.monitor !== "none";
  const body: Record<string, unknown> = {
    ...withoutId,
    qualityProfileId: request.qualityProfileId,
    rootFolderPath: request.rootFolderPath,
    monitored,
    monitorNewItems: request.monitorNewItems,
    seriesType: request.seriesType,
    seasonFolder: request.seasonFolder,
    tags: request.tagIds,
    addOptions: {
      monitor: request.monitor,
      searchForMissingEpisodes: request.searchForMissingEpisodes,
      searchForCutoffUnmetEpisodes: request.searchForCutoffUnmetEpisodes,
    },
  };
  if (request.path) {
    body.path = request.path;
  }

  const saved = await arrJson<SonarrSeries>(instance, "/api/v3/series", {
    method: "POST",
    body,
  });
  return toEditDetail(instanceId, saved);
}

/**
 * Mirror Sonarr's SeriesDetailsLinks UI.
 * Source: https://github.com/Sonarr/Sonarr/blob/develop/frontend/src/Series/Details/SeriesDetailsLinks.tsx
 */
export function buildSeriesLinks(detail: SeriesDetail): SeriesLink[] {
  type LinkDraft = SeriesLink & { hasExternalId: boolean };
  const links: LinkDraft[] = [];

  if (detail.tvdbId) {
    links.push({
      id: "tvdb",
      label: "The TVDB",
      url: `https://www.thetvdb.com/?tab=series&id=${detail.tvdbId}`,
      hasExternalId: true,
    });
    links.push({
      id: "trakt",
      label: "Trakt",
      url: `https://trakt.tv/search/tvdb/${detail.tvdbId}?id_type=show`,
      hasExternalId: false,
    });
  }

  if (detail.tvMazeId) {
    links.push({
      id: "tvmaze",
      label: "TV Maze",
      url: `https://www.tvmaze.com/shows/${detail.tvMazeId}/_`,
      hasExternalId: true,
    });
  }

  if (detail.imdbId) {
    links.push({
      id: "imdb",
      label: "IMDb",
      url: `https://imdb.com/title/${detail.imdbId}/`,
      hasExternalId: true,
    });
    links.push({
      id: "mdblist",
      label: "MDBList",
      url: `https://mdblist.com/show/${detail.imdbId}`,
      hasExternalId: false,
    });
  }

  if (detail.tmdbId) {
    links.push({
      id: "tmdb",
      label: "TMDb",
      url: `https://www.themoviedb.org/tv/${detail.tmdbId}`,
      hasExternalId: true,
    });
  }

  if (detail.youTubeTrailerId) {
    links.push({
      id: "trailer",
      label: "Trailer",
      url: `https://www.youtube.com/watch?v=${detail.youTubeTrailerId}`,
      hasExternalId: false,
    });
  }

  links.sort((a, b) => Number(b.hasExternalId) - Number(a.hasExternalId));
  return links.map(({ id, label, url }) => ({ id, label, url }));
}
