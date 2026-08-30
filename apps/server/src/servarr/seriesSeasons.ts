/**
 * Sonarr seasons / episodes for the show detail accordion.
 * Upstream: /episode, SeasonSearch, EpisodeSearch, /release, series season monitor.
 */
import type {
  Instance,
  SeriesEpisode,
  SeriesEpisodeStatus,
  SeriesHistoryEvent,
  SeriesManageFile,
  SeriesRelease,
  SeriesRenamePreview,
  SeriesSeasonSummary,
} from "@umbrellarr/shared";
import { SeriesHistoryEventTypeSchema } from "@umbrellarr/shared";
import { arrJson } from "./client.js";
import { fetchSeriesManageFiles, fetchSeriesRenamePreview } from "./showActions.js";

type SonarrSeasonStatistics = {
  episodeCount?: number;
  episodeFileCount?: number;
  totalEpisodeCount?: number;
  sizeOnDisk?: number;
};

type SonarrSeason = {
  seasonNumber?: number;
  monitored?: boolean;
  statistics?: SonarrSeasonStatistics;
};

type SonarrSeries = {
  id: number;
  seasons?: SonarrSeason[];
  [key: string]: unknown;
};

type SonarrEpisode = {
  id: number;
  seriesId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  title?: string;
  airDate?: string;
  airDateUtc?: string;
  hasFile?: boolean;
  monitored?: boolean;
  episodeFileId?: number;
};

/** Sonarr queue/details item — used like EpisodeStatus.tsx queue selector. */
type SonarrQueueItem = {
  episodeId?: number;
  episodeIds?: number[];
  seriesId?: number;
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

function requireInstance(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) throw new Error(`Instance ${instanceId} not found`);
  if (instance.kind !== "sonarr") {
    throw new Error(`Instance ${instanceId} is not a Sonarr client`);
  }
  return instance;
}

/**
 * Mirror Sonarr EpisodeStatus priority (queue → file → monitored → aired).
 * Source: https://github.com/Sonarr/Sonarr/blob/develop/frontend/src/Episode/EpisodeStatus.tsx
 */
export function deriveSeriesEpisodeStatus(ep: {
  hasFile?: boolean;
  monitored?: boolean;
  airDateUtc?: string;
  downloading?: boolean;
}): SeriesEpisodeStatus {
  if (ep.downloading) return "downloading";
  if (ep.hasFile) return "downloaded";
  if (!ep.monitored) return "unmonitored";
  if (ep.airDateUtc) {
    const air = Date.parse(ep.airDateUtc);
    if (Number.isFinite(air) && air > Date.now()) return "unaired";
  }
  return "missing";
}

function downloadingEpisodeIds(queue: SonarrQueueItem[]): Set<number> {
  const ids = new Set<number>();
  for (const item of queue) {
    if (item.episodeId != null) ids.add(item.episodeId);
    for (const id of item.episodeIds ?? []) {
      if (id != null) ids.add(id);
    }
  }
  return ids;
}

function toEpisode(ep: SonarrEpisode, downloadingIds: Set<number>): SeriesEpisode | null {
  if (ep.id == null || ep.seasonNumber == null || ep.episodeNumber == null) return null;
  const downloading = downloadingIds.has(ep.id);
  return {
    id: ep.id,
    seasonNumber: ep.seasonNumber,
    episodeNumber: ep.episodeNumber,
    title: ep.title ?? "",
    airDate: ep.airDate || undefined,
    airDateUtc: ep.airDateUtc || undefined,
    hasFile: Boolean(ep.hasFile),
    monitored: Boolean(ep.monitored),
    episodeFileId: ep.episodeFileId,
    status: deriveSeriesEpisodeStatus({ ...ep, downloading }),
  };
}

export async function fetchSeriesSeasons(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
): Promise<SeriesSeasonSummary[]> {
  const instance = requireInstance(instances, instanceId);
  const series = await arrJson<SonarrSeries>(instance, `/api/v3/series/${seriesId}`);
  const seasons = (series.seasons ?? [])
    .filter((s): s is SonarrSeason & { seasonNumber: number } => s.seasonNumber != null)
    .map((s) => {
      const stats = s.statistics;
      return {
        seasonNumber: s.seasonNumber,
        monitored: Boolean(s.monitored),
        episodeCount: stats?.episodeCount ?? 0,
        episodeFileCount: stats?.episodeFileCount ?? 0,
        sizeOnDisk: stats?.sizeOnDisk,
        totalEpisodeCount: stats?.totalEpisodeCount,
      } satisfies SeriesSeasonSummary;
    })
    .sort((a, b) => b.seasonNumber - a.seasonNumber);
  return seasons;
}

export async function fetchSeriesEpisodes(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
  seasonNumber?: number,
): Promise<SeriesEpisode[]> {
  const instance = requireInstance(instances, instanceId);
  const [records, queue] = await Promise.all([
    arrJson<SonarrEpisode[]>(instance, `/api/v3/episode?seriesId=${seriesId}`),
    arrJson<SonarrQueueItem[]>(
      instance,
      `/api/v3/queue/details?seriesId=${seriesId}`,
    ).catch((error) => {
      console.warn(`[series] queue details failed for series ${seriesId}`, error);
      return [] as SonarrQueueItem[];
    }),
  ]);
  const downloadingIds = downloadingEpisodeIds(queue);
  return records
    .map((ep) => toEpisode(ep, downloadingIds))
    .filter((e): e is SeriesEpisode => e != null)
    .filter((e) => (seasonNumber == null ? true : e.seasonNumber === seasonNumber))
    .sort((a, b) => {
      // Sonarr season view: newest season/episode first (ep 1 at the bottom).
      if (a.seasonNumber !== b.seasonNumber) return b.seasonNumber - a.seasonNumber;
      return b.episodeNumber - a.episodeNumber;
    });
}

export async function searchSeason(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
  seasonNumber: number,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v3/command", {
    method: "POST",
    body: { name: "SeasonSearch", seriesId, seasonNumber },
  });
}

export async function searchEpisode(
  instances: Instance[],
  instanceId: string,
  episodeId: number,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v3/command", {
    method: "POST",
    body: { name: "EpisodeSearch", episodeIds: [episodeId] },
  });
}

function mapRelease(record: SonarrRelease): SeriesRelease | null {
  if (!record.guid || record.indexerId == null) return null;
  const protocol =
    record.protocol === "torrent" || record.protocol === "usenet"
      ? record.protocol
      : "unknown";
  const q = record.quality?.quality;
  const quality =
    q?.id != null && q.name
      ? {
          quality: {
            id: q.id,
            name: q.name,
            source: q.source,
            resolution: q.resolution,
            modifier: q.modifier,
          },
          revision: {
            version: record.quality?.revision?.version ?? 1,
            real: record.quality?.revision?.real ?? 0,
            isRepack: record.quality?.revision?.isRepack ?? false,
          },
        }
      : undefined;
  return {
    guid: record.guid,
    protocol,
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
    languages: (record.languages ?? [])
      .filter((l): l is { id: number; name: string } => l.id != null && Boolean(l.name))
      .map((l) => ({ id: l.id, name: l.name })),
    customFormats: (record.customFormats ?? [])
      .map((f) => f.name)
      .filter((n): n is string => Boolean(n)),
    customFormatScore: record.customFormatScore ?? 0,
    indexerFlags: Array.isArray(record.indexerFlags)
      ? record.indexerFlags.map(String)
      : [],
    rejections: record.rejections ?? [],
    approved: Boolean(record.approved),
    rejected: Boolean(record.rejected) || (record.rejections?.length ?? 0) > 0,
    downloadAllowed: Boolean(record.downloadAllowed),
  };
}

export async function fetchSeasonReleases(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
  seasonNumber: number,
): Promise<SeriesRelease[]> {
  const instance = requireInstance(instances, instanceId);
  const records = await arrJson<SonarrRelease[]>(
    instance,
    `/api/v3/release?seriesId=${seriesId}&seasonNumber=${seasonNumber}`,
    { timeoutMs: 120_000 },
  );
  return records.map(mapRelease).filter((r): r is SeriesRelease => r != null);
}

export async function fetchEpisodeReleases(
  instances: Instance[],
  instanceId: string,
  episodeId: number,
): Promise<SeriesRelease[]> {
  const instance = requireInstance(instances, instanceId);
  const records = await arrJson<SonarrRelease[]>(
    instance,
    `/api/v3/release?episodeId=${episodeId}`,
    { timeoutMs: 120_000 },
  );
  return records.map(mapRelease).filter((r): r is SeriesRelease => r != null);
}

export async function fetchSeriesHistoryForSeason(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
  seasonNumber: number,
): Promise<SeriesHistoryEvent[]> {
  const instance = requireInstance(instances, instanceId);
  const records = await arrJson<SonarrHistory[]>(
    instance,
    `/api/v3/history/series?seriesId=${seriesId}&seasonNumber=${seasonNumber}&includeEpisode=true`,
  );
  return records
    .map((record): SeriesHistoryEvent => {
      const data: Record<string, string> = {};
      for (const [key, value] of Object.entries(record.data ?? {})) {
        if (value != null && value !== "") data[key] = value;
      }
      const eventParsed = SeriesHistoryEventTypeSchema.safeParse(record.eventType);
      return {
        id: record.id,
        eventType: eventParsed.success ? eventParsed.data : "unknown",
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
        seasonNumber: record.episode?.seasonNumber ?? seasonNumber,
        episodeId: record.episode?.id ?? record.episodeId,
        data,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchSeriesRenamePreviewForSeason(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
  seasonNumber: number,
): Promise<SeriesRenamePreview[]> {
  const items = await fetchSeriesRenamePreview(instances, instanceId, seriesId);
  // Prefer Sonarr seasonNumber when present; else match via episode files for the season.
  const withSeason = items.filter((i) => i.seasonNumber === seasonNumber);
  if (withSeason.length > 0 || items.some((i) => i.seasonNumber != null)) {
    return withSeason;
  }
  const files = await fetchSeriesManageFiles(instances, instanceId, seriesId);
  const seasonFileIds = new Set(
    files.filter((f) => f.seasonNumber === seasonNumber).map((f) => f.id),
  );
  return items.filter((i) => seasonFileIds.has(i.episodeFileId));
}

export async function fetchSeriesManageFilesForSeason(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
  seasonNumber: number,
): Promise<SeriesManageFile[]> {
  const files = await fetchSeriesManageFiles(instances, instanceId, seriesId);
  return files.filter((f) => f.seasonNumber === seasonNumber);
}

/** Toggle a single season’s monitored flag via series GET-merge-PUT. */
export async function setSeasonMonitored(
  instances: Instance[],
  instanceId: string,
  seriesId: number,
  seasonNumber: number,
  monitored: boolean,
): Promise<SeriesSeasonSummary[]> {
  const instance = requireInstance(instances, instanceId);
  const current = await arrJson<SonarrSeries>(instance, `/api/v3/series/${seriesId}`);
  const seasons = (current.seasons ?? []).map((s) =>
    s.seasonNumber === seasonNumber ? { ...s, monitored } : s,
  );
  await arrJson(instance, `/api/v3/series/${seriesId}`, {
    method: "PUT",
    body: { ...current, seasons },
  });
  return fetchSeriesSeasons(instances, instanceId, seriesId);
}
