import type {
  ArrKind,
  HistoryEventType,
  HistoryKind,
  HistoryListItem,
  HistoryProtocolFilter,
  Instance,
  UnifiedHistoryResponse,
} from "@umbrellarr/shared";
import { HistoryEventTypeSchema, PROWLARR_HISTORY_EVENT_TYPES } from "@umbrellarr/shared";
import { arrJson } from "./client.js";

type ArrLanguage = { name?: string };
type ArrCustomFormat = { name?: string };
type ArrQuality = { quality?: { name?: string } };

type ArrHistoryRecord = {
  id: number;
  sourceTitle?: string;
  eventType?: string;
  date?: string;
  downloadId?: string;
  customFormatScore?: number;
  languages?: ArrLanguage[];
  quality?: ArrQuality;
  customFormats?: ArrCustomFormat[];
  protocol?: string;
  data?: Record<string, string | number | boolean | null | undefined>;
  movieId?: number;
  movie?: { id?: number; title?: string; year?: number };
  seriesId?: number;
  series?: { id?: number; title?: string };
  episodeId?: number;
  episode?: {
    id?: number;
    title?: string;
    seasonNumber?: number;
    episodeNumber?: number;
  };
  artistId?: number;
  artist?: { id?: number; artistName?: string; name?: string };
  albumId?: number;
  album?: { id?: number; title?: string };
  trackId?: number;
  track?: { id?: number; title?: string };
  indexerId?: number;
  indexer?: { id?: number; name?: string };
  successful?: boolean;
};

type ArrHistoryPage = {
  page?: number;
  pageSize?: number;
  totalRecords?: number;
  records?: ArrHistoryRecord[];
};

export type HistoryListQuery = {
  page?: number;
  pageSize?: number;
  eventType?: HistoryEventType | "all";
  protocol?: HistoryProtocolFilter | "all";
};

function isArrKind(kind: Instance["kind"]): kind is ArrKind {
  return kind === "radarr" || kind === "sonarr" || kind === "lidarr";
}

function requireArrInstance(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId && isArrKind(i.kind));
  if (!instance) {
    throw new Error(`Arr instance not found: ${instanceId}`);
  }
  return instance;
}

function requireProwlarrInstance(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId && i.kind === "prowlarr");
  if (!instance) {
    throw new Error(`Prowlarr instance not found: ${instanceId}`);
  }
  return instance;
}

function apiBase(kind: ArrKind): string {
  return kind === "lidarr" ? "/api/v1" : "/api/v3";
}

function parseEventType(value: string | undefined): HistoryEventType {
  if (!value) return "unknown";
  const direct = HistoryEventTypeSchema.safeParse(value);
  if (direct.success) return direct.data;
  const camel = value.charAt(0).toLowerCase() + value.slice(1);
  const fromPascal = HistoryEventTypeSchema.safeParse(camel);
  return fromPascal.success ? fromPascal.data : "unknown";
}

function toProwlarrEventTypeParam(eventType: HistoryEventType): string {
  return eventType.charAt(0).toUpperCase() + eventType.slice(1);
}

function stringifyData(
  data?: Record<string, string | number | boolean | null | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data) return out;
  for (const [key, value] of Object.entries(data)) {
    if (value == null || value === "") continue;
    out[key] = typeof value === "string" ? value : String(value);
  }
  return out;
}

function mapArrHistoryItem(instance: Instance, record: ArrHistoryRecord): HistoryListItem {
  const kind = instance.kind as ArrKind;
  return {
    id: record.id,
    instanceId: instance.id,
    kind,
    eventType: parseEventType(record.eventType),
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
    data: stringifyData(record.data),
    movieId: record.movieId ?? record.movie?.id,
    movieTitle: record.movie?.title,
    year: record.movie?.year,
    seriesId: record.seriesId ?? record.series?.id,
    seriesTitle: record.series?.title,
    episodeId: record.episodeId ?? record.episode?.id,
    seasonNumber: record.episode?.seasonNumber,
    episodeNumber: record.episode?.episodeNumber,
    episodeTitle: record.episode?.title,
    artistId: record.artistId ?? record.artist?.id,
    artistName: record.artist?.artistName ?? record.artist?.name,
    albumId: record.albumId ?? record.album?.id,
    albumTitle: record.album?.title,
    trackId: record.trackId ?? record.track?.id,
    trackTitle: record.track?.title,
  };
}

function mapProwlarrHistoryItem(instance: Instance, record: ArrHistoryRecord): HistoryListItem {
  const data = stringifyData(record.data);
  const query =
    data.query?.trim() ||
    data.search?.trim() ||
    record.sourceTitle?.trim() ||
    "";
  const indexerName =
    record.indexer?.name?.trim() ||
    data.indexer?.trim() ||
    "";
  return {
    id: record.id,
    instanceId: instance.id,
    kind: "prowlarr",
    eventType: parseEventType(record.eventType),
    sourceTitle: query,
    languages: [],
    customFormats: [],
    date: record.date ?? "",
    downloadId: record.downloadId || undefined,
    data,
    indexerId: record.indexerId ?? record.indexer?.id,
    indexerName: indexerName || undefined,
    successful: record.successful,
  };
}

function includeParams(kind: ArrKind): string {
  if (kind === "radarr") return "includeMovie=true";
  if (kind === "sonarr") return "includeSeries=true&includeEpisode=true";
  return "includeArtist=true&includeAlbum=true&includeTrack=true";
}

function shouldFetchArr(query: HistoryListQuery): boolean {
  if (query.eventType && query.eventType !== "all" && PROWLARR_HISTORY_EVENT_TYPES.has(query.eventType)) {
    return false;
  }
  return true;
}

function shouldFetchProwlarr(query: HistoryListQuery): boolean {
  if (query.protocol && query.protocol !== "all") return false;
  if (
    query.eventType &&
    query.eventType !== "all" &&
    !PROWLARR_HISTORY_EVENT_TYPES.has(query.eventType)
  ) {
    return false;
  }
  return true;
}

export async function fetchHistoryList(
  instances: Instance[],
  instanceId: string,
  query: HistoryListQuery = {},
): Promise<{ items: HistoryListItem[]; page: number; pageSize: number; totalRecords: number }> {
  const instance = requireArrInstance(instances, instanceId);
  const kind = instance.kind as ArrKind;
  const page = query.page && query.page > 0 ? query.page : 1;
  const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 200) : 50;

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  params.set("sortKey", "date");
  params.set("sortDirection", "descending");
  for (const part of includeParams(kind).split("&")) {
    const [k, v] = part.split("=");
    if (k && v) params.set(k, v);
  }
  if (query.eventType && query.eventType !== "all") {
    params.set("eventType", query.eventType);
  }
  if (query.protocol && query.protocol !== "all") {
    params.set("protocol", query.protocol);
  }

  const pageData = await arrJson<ArrHistoryPage>(
    instance,
    `${apiBase(kind)}/history?${params}`,
    { timeoutMs: 30_000 },
  );

  return {
    items: (pageData.records ?? []).map((r) => mapArrHistoryItem(instance, r)),
    page: pageData.page ?? page,
    pageSize: pageData.pageSize ?? pageSize,
    totalRecords: pageData.totalRecords ?? 0,
  };
}

export async function fetchProwlarrHistoryList(
  instances: Instance[],
  instanceId: string,
  query: HistoryListQuery = {},
): Promise<{ items: HistoryListItem[]; page: number; pageSize: number; totalRecords: number }> {
  const instance = requireProwlarrInstance(instances, instanceId);
  const page = query.page && query.page > 0 ? query.page : 1;
  const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 200) : 50;

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  params.set("sortKey", "date");
  params.set("sortDirection", "descending");
  if (query.eventType && query.eventType !== "all") {
    params.set("eventType", toProwlarrEventTypeParam(query.eventType));
  }

  const pageData = await arrJson<ArrHistoryPage>(instance, `/api/v1/history?${params}`, {
    timeoutMs: 30_000,
  });

  return {
    items: (pageData.records ?? []).map((r) => mapProwlarrHistoryItem(instance, r)),
    page: pageData.page ?? page,
    pageSize: pageData.pageSize ?? pageSize,
    totalRecords: pageData.totalRecords ?? 0,
  };
}

function sortHistoryItems(items: HistoryListItem[]): HistoryListItem[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchUnifiedHistory(
  instances: Instance[],
  query: HistoryListQuery & { instanceId?: string } = {},
): Promise<UnifiedHistoryResponse> {
  const arrInstances = instances.filter((i) => isArrKind(i.kind));
  const prowlarrInstances = instances.filter((i) => i.kind === "prowlarr");

  let targets: Instance[] = [];
  if (query.instanceId) {
    const match = instances.find((i) => i.id === query.instanceId);
    if (!match || (match.kind !== "prowlarr" && !isArrKind(match.kind))) {
      throw new Error(`History instance not found: ${query.instanceId}`);
    }
    targets = [match];
  } else {
    if (shouldFetchArr(query)) targets.push(...arrInstances);
    if (shouldFetchProwlarr(query)) targets.push(...prowlarrInstances);
  }

  // Single-instance filter still respects protocol/event skip rules
  if (query.instanceId && targets[0]) {
    const only = targets[0];
    if (only.kind === "prowlarr" && !shouldFetchProwlarr(query)) {
      return { items: [], page: query.page ?? 1, pageSize: query.pageSize ?? 50, totalRecords: 0, errors: [] };
    }
    if (isArrKind(only.kind) && !shouldFetchArr(query)) {
      return { items: [], page: query.page ?? 1, pageSize: query.pageSize ?? 50, totalRecords: 0, errors: [] };
    }
  }

  const page = query.page && query.page > 0 ? query.page : 1;
  const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 200) : 50;

  const settled = await Promise.allSettled(
    targets.map((instance) =>
      instance.kind === "prowlarr"
        ? fetchProwlarrHistoryList(instances, instance.id, { ...query, page, pageSize })
        : fetchHistoryList(instances, instance.id, { ...query, page, pageSize }),
    ),
  );

  const items: HistoryListItem[] = [];
  const errors: UnifiedHistoryResponse["errors"] = [];
  let totalRecords = 0;

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]!;
    const instance = targets[i]!;
    if (result.status === "fulfilled") {
      items.push(...result.value.items);
      totalRecords += result.value.totalRecords;
    } else {
      const message =
        result.reason instanceof Error ? result.reason.message : "History fetch failed";
      errors.push({
        instanceId: instance.id,
        instanceName: instance.name,
        message,
      });
    }
  }

  return {
    items: sortHistoryItems(items),
    page,
    pageSize,
    totalRecords,
    errors,
  };
}

export async function deleteHistoryItem(
  instances: Instance[],
  instanceId: string,
  historyId: number,
): Promise<void> {
  const instance = requireArrInstance(instances, instanceId);
  const kind = instance.kind as ArrKind;
  await arrJson(instance, `${apiBase(kind)}/history/${historyId}`, { method: "DELETE" });
}

export type { HistoryKind };
