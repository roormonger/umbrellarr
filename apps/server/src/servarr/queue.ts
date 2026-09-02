import type {
  ArrKind,
  Instance,
  QueueGrabRequest,
  QueueListItem,
  QueueListResponse,
  QueueManualImportItem,
  QueueManualImportUpdateItem,
  QueueProtocol,
  QueueRemoveRequest,
  QueueStatus,
  QueueStatusFilter,
  UnifiedQueueResponse,
} from "@umbrellarr/shared";
import { arrJson } from "./client.js";

type ArrLanguage = { id?: number; name?: string };
type ArrQuality = {
  quality?: { id?: number; name?: string; source?: string; resolution?: number; modifier?: string };
  revision?: { version?: number; real?: number; isRepack?: boolean };
};
type ArrCustomFormat = { name?: string };
type ArrStatusMessage = { title?: string; messages?: string[] };

type ArrQueueRecord = {
  id: number;
  movieId?: number;
  movie?: { id?: number; title?: string; year?: number };
  seriesId?: number;
  series?: { id?: number; title?: string; titleSlug?: string };
  episodeId?: number;
  episode?: {
    id?: number;
    title?: string;
    seasonNumber?: number;
    episodeNumber?: number;
  };
  seasonNumber?: number;
  artistId?: number;
  artist?: { id?: number; artistName?: string; name?: string };
  albumId?: number;
  album?: { id?: number; title?: string };
  languages?: ArrLanguage[];
  quality?: ArrQuality;
  customFormats?: ArrCustomFormat[];
  customFormatScore?: number;
  size?: number;
  sizeleft?: number;
  title?: string;
  estimatedCompletionTime?: string;
  timeleft?: string;
  status?: string;
  trackedDownloadStatus?: string;
  trackedDownloadState?: string;
  statusMessages?: ArrStatusMessage[];
  errorMessage?: string;
  downloadId?: string;
  protocol?: string;
  downloadClient?: string;
  downloadClientHasPostImportCategory?: boolean;
  indexer?: string;
  outputPath?: string;
};

type ArrQueuePage = {
  page?: number;
  pageSize?: number;
  totalRecords?: number;
  records?: ArrQueueRecord[];
};

type ArrQueueStatus = {
  totalCount?: number;
  count?: number;
  unknownCount?: number;
  errors?: boolean;
  warnings?: boolean;
};

type ArrManualImport = {
  id?: number;
  path?: string;
  relativePath?: string;
  name?: string;
  size?: number;
  downloadId?: string;
  movieId?: number;
  movie?: { id?: number; title?: string };
  seriesId?: number;
  series?: { id?: number; title?: string };
  seasonNumber?: number;
  episodes?: Array<{ id?: number; seasonNumber?: number; episodeNumber?: number; title?: string }>;
  episodeIds?: number[];
  artistId?: number;
  artist?: { id?: number; artistName?: string; name?: string };
  albumId?: number;
  album?: { id?: number; title?: string };
  quality?: ArrQuality;
  languages?: ArrLanguage[];
  releaseGroup?: string;
  indexerFlags?: number;
  releaseType?: string;
  rejections?: Array<{ reason?: string; type?: string }>;
};

export type QueueListQuery = {
  page?: number;
  pageSize?: number;
  includeUnknown?: boolean;
  protocol?: QueueProtocol | "all";
  status?: QueueStatusFilter;
};

function requireArrInstance(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find(
    (i) => i.id === instanceId && (i.kind === "radarr" || i.kind === "sonarr" || i.kind === "lidarr"),
  );
  if (!instance) {
    throw new Error(`Arr instance not found: ${instanceId}`);
  }
  return instance;
}

function apiBase(kind: ArrKind): string {
  return kind === "lidarr" ? "/api/v1" : "/api/v3";
}

function mapProtocol(value?: string): QueueProtocol {
  if (value === "usenet" || value === "torrent") return value;
  return "unknown";
}

function qualityName(quality?: ArrQuality): string | undefined {
  return quality?.quality?.name;
}

function isPendingState(state?: string): boolean {
  return state === "delay" || state === "downloadClientUnavailable";
}

function canGrab(record: ArrQueueRecord): boolean {
  return isPendingState(record.trackedDownloadState);
}

function canManualImport(record: ArrQueueRecord): boolean {
  if (!record.downloadId) return false;
  const tracked = (record.trackedDownloadStatus ?? "").toLowerCase();
  const status = (record.status ?? "").toLowerCase();
  return (
    tracked === "warning" ||
    status === "completed" ||
    status === "warning" ||
    Boolean(record.outputPath)
  );
}

function mapQueueItem(instance: Instance, record: ArrQueueRecord): QueueListItem {
  const kind = instance.kind as ArrKind;
  const movieTitle = record.movie?.title;
  const seriesTitle = record.series?.title;
  const artistName = record.artist?.artistName ?? record.artist?.name;
  const albumTitle = record.album?.title;
  const displayTitle =
    movieTitle ??
    seriesTitle ??
    (artistName && albumTitle ? `${artistName} - ${albumTitle}` : artistName) ??
    record.title ??
    `Queue #${record.id}`;

  return {
    id: record.id,
    instanceId: instance.id,
    kind,
    title: displayTitle,
    movieId: record.movieId ?? record.movie?.id,
    movieTitle,
    year: record.movie?.year,
    seriesId: record.seriesId ?? record.series?.id,
    seriesTitle,
    episodeId: record.episodeId ?? record.episode?.id,
    seasonNumber: record.episode?.seasonNumber ?? record.seasonNumber,
    episodeNumber: record.episode?.episodeNumber,
    episodeTitle: record.episode?.title,
    artistId: record.artistId ?? record.artist?.id,
    artistName,
    albumId: record.albumId ?? record.album?.id,
    albumTitle,
    languages: (record.languages ?? []).map((l) => l.name).filter((n): n is string => Boolean(n)),
    qualityName: qualityName(record.quality),
    customFormats: (record.customFormats ?? [])
      .map((f) => f.name)
      .filter((n): n is string => Boolean(n)),
    customFormatScore: record.customFormatScore,
    size: record.size,
    sizeleft: record.sizeleft,
    timeleft: record.timeleft,
    estimatedCompletionTime: record.estimatedCompletionTime,
    status: record.status,
    trackedDownloadStatus: record.trackedDownloadStatus,
    trackedDownloadState: record.trackedDownloadState,
    statusMessages: (record.statusMessages ?? []).map((m) => ({
      title: m.title,
      messages: m.messages ?? [],
    })),
    errorMessage: record.errorMessage,
    protocol: mapProtocol(record.protocol),
    indexer: record.indexer,
    downloadClient: record.downloadClient,
    downloadClientHasPostImportCategory: Boolean(record.downloadClientHasPostImportCategory),
    downloadId: record.downloadId,
    outputPath: record.outputPath,
    canGrab: canGrab(record),
    canManualImport: canManualImport(record),
    isPending: isPendingState(record.trackedDownloadState),
  };
}

function unknownParam(kind: ArrKind): string {
  if (kind === "radarr") return "includeUnknownMovieItems";
  if (kind === "sonarr") return "includeUnknownSeriesItems";
  return "includeUnknownArtistItems";
}

function includeParams(kind: ArrKind): string {
  if (kind === "radarr") return "includeMovie=true";
  if (kind === "sonarr") return "includeSeries=true&includeEpisode=true";
  return "includeArtist=true&includeAlbum=true";
}

function queueSortRank(item: QueueListItem): number {
  const status = (item.status ?? "").toLowerCase();
  const tracked = (item.trackedDownloadStatus ?? "").toLowerCase();
  if (status === "downloading" || tracked === "downloading") return 0;
  if (status === "importing") return 1;
  if (status === "paused") return 2;
  if (status === "queued" || item.trackedDownloadState === "delay") return 3;
  if (status === "completed") return 4;
  return 5;
}

function sortQueueItems(items: QueueListItem[]): QueueListItem[] {
  return [...items].sort((a, b) => {
    const rank = queueSortRank(a) - queueSortRank(b);
    if (rank !== 0) return rank;
    const timeA = a.timeleft ?? "";
    const timeB = b.timeleft ?? "";
    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return a.title.localeCompare(b.title);
  });
}

function mergeQueueStatus(statuses: QueueStatus[]): QueueStatus {
  return statuses.reduce<QueueStatus>(
    (acc, status) => ({
      totalCount: acc.totalCount + status.totalCount,
      count: acc.count + status.count,
      unknownCount: acc.unknownCount + status.unknownCount,
      errors: acc.errors || status.errors,
      warnings: acc.warnings || status.warnings,
    }),
    { totalCount: 0, count: 0, unknownCount: 0, errors: false, warnings: false },
  );
}

export async function fetchUnifiedQueue(
  instances: Instance[],
  query: QueueListQuery & { instanceId?: string } = {},
): Promise<UnifiedQueueResponse> {
  const arrInstances = instances.filter(
    (i) => i.kind === "radarr" || i.kind === "sonarr" || i.kind === "lidarr",
  );
  const targets = query.instanceId
    ? arrInstances.filter((i) => i.id === query.instanceId)
    : arrInstances;

  if (query.instanceId && targets.length === 0) {
    throw new Error(`Arr instance not found: ${query.instanceId}`);
  }

  const statusFilter = query.status ?? "all";
  const settled = await Promise.allSettled(
    targets.map(async (instance) => {
      const instanceQuery: QueueListQuery = {
        ...query,
        status:
          statusFilter !== "all" && instance.kind === "lidarr" ? "all" : statusFilter,
      };
      return fetchQueueList(instances, instance.id, instanceQuery);
    }),
  );

  const items: QueueListItem[] = [];
  const statuses: QueueStatus[] = [];
  const errors: UnifiedQueueResponse["errors"] = [];
  let totalRecords = 0;

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]!;
    const instance = targets[i]!;
    if (result.status === "fulfilled") {
      let instanceItems = result.value.items;
      if (statusFilter !== "all" && instance.kind === "lidarr") {
        instanceItems = instanceItems.filter((item) => {
          const status = (item.status ?? "").toLowerCase();
          if (statusFilter === "downloading") return status === "downloading";
          if (statusFilter === "paused") return status === "paused";
          if (statusFilter === "queued") return status === "queued";
          if (statusFilter === "completed") return status === "completed";
          if (statusFilter === "warning") {
            return status === "warning" || item.trackedDownloadStatus === "warning";
          }
          if (statusFilter === "failed") return status === "failed";
          if (statusFilter === "delay") return item.trackedDownloadState === "delay";
          return true;
        });
      }
      items.push(...instanceItems);
      totalRecords += result.value.totalRecords;
      if (result.value.status) statuses.push(result.value.status);
    } else {
      const message =
        result.reason instanceof Error ? result.reason.message : "Queue fetch failed";
      errors.push({
        instanceId: instance.id,
        instanceName: instance.name,
        message,
      });
    }
  }

  return {
    items: sortQueueItems(items),
    totalRecords,
    status: statuses.length > 0 ? mergeQueueStatus(statuses) : undefined,
    errors,
  };
}

export async function fetchQueueList(
  instances: Instance[],
  instanceId: string,
  query: QueueListQuery = {},
): Promise<QueueListResponse> {
  const instance = requireArrInstance(instances, instanceId);
  const kind = instance.kind as ArrKind;
  const page = query.page && query.page > 0 ? query.page : 1;
  const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 200) : 50;
  const includeUnknown = query.includeUnknown ?? true;

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  params.set("sortKey", "timeleft");
  params.set("sortDirection", "ascending");
  params.set(unknownParam(kind), String(includeUnknown));
  for (const part of includeParams(kind).split("&")) {
    const [k, v] = part.split("=");
    if (k && v) params.set(k, v);
  }
  if (query.protocol && query.protocol !== "all") {
    params.set("protocol", query.protocol);
  }
  if (query.status && query.status !== "all" && kind !== "lidarr") {
    params.set("status", query.status);
  }

  const [pageData, status] = await Promise.all([
    arrJson<ArrQueuePage>(instance, `${apiBase(kind)}/queue?${params}`, { timeoutMs: 30_000 }),
    arrJson<ArrQueueStatus>(instance, `${apiBase(kind)}/queue/status`).catch(
      () => ({} as ArrQueueStatus),
    ),
  ]);

  return {
    items: (pageData.records ?? []).map((r) => mapQueueItem(instance, r)),
    page: pageData.page ?? page,
    pageSize: pageData.pageSize ?? pageSize,
    totalRecords: pageData.totalRecords ?? 0,
    status: {
      totalCount: status.totalCount ?? pageData.totalRecords ?? 0,
      count: status.count ?? 0,
      unknownCount: status.unknownCount ?? 0,
      errors: Boolean(status.errors),
      warnings: Boolean(status.warnings),
    },
  };
}

export async function fetchQueueStatus(
  instances: Instance[],
  instanceId: string,
): Promise<QueueStatus> {
  const instance = requireArrInstance(instances, instanceId);
  const kind = instance.kind as ArrKind;
  const status = await arrJson<ArrQueueStatus>(instance, `${apiBase(kind)}/queue/status`);
  return {
    totalCount: status.totalCount ?? 0,
    count: status.count ?? 0,
    unknownCount: status.unknownCount ?? 0,
    errors: Boolean(status.errors),
    warnings: Boolean(status.warnings),
  };
}

function removeQuery(request: QueueRemoveRequest): string {
  const removeFromClient = request.removalMethod === "removeFromClient";
  const changeCategory = request.removalMethod === "changeCategory";
  const blocklist = request.blocklistMode !== "doNotBlocklist";
  const skipRedownload = request.blocklistMode === "blocklistOnly";
  const params = new URLSearchParams({
    removeFromClient: String(removeFromClient),
    changeCategory: String(changeCategory),
    blocklist: String(blocklist),
    skipRedownload: String(skipRedownload),
  });
  return params.toString();
}

export async function removeQueueItems(
  instances: Instance[],
  instanceId: string,
  request: QueueRemoveRequest,
): Promise<void> {
  const instance = requireArrInstance(instances, instanceId);
  const kind = instance.kind as ArrKind;
  const qs = removeQuery(request);
  if (request.ids.length === 1) {
    await arrJson(instance, `${apiBase(kind)}/queue/${request.ids[0]}?${qs}`, {
      method: "DELETE",
    });
    return;
  }
  await arrJson(instance, `${apiBase(kind)}/queue/bulk?${qs}`, {
    method: "DELETE",
    body: { ids: request.ids },
  });
}

export async function grabQueueItems(
  instances: Instance[],
  instanceId: string,
  request: QueueGrabRequest,
): Promise<void> {
  const instance = requireArrInstance(instances, instanceId);
  const kind = instance.kind as ArrKind;
  if (request.ids.length === 1) {
    await arrJson(instance, `${apiBase(kind)}/queue/grab/${request.ids[0]}`, { method: "POST" });
    return;
  }
  await arrJson(instance, `${apiBase(kind)}/queue/grab/bulk`, {
    method: "POST",
    body: { ids: request.ids },
  });
}

export async function refreshMonitoredDownloads(
  instances: Instance[],
  instanceId: string,
): Promise<void> {
  const instance = requireArrInstance(instances, instanceId);
  const kind = instance.kind as ArrKind;
  await arrJson(instance, `${apiBase(kind)}/command`, {
    method: "POST",
    body: { name: "RefreshMonitoredDownloads" },
    timeoutMs: 60_000,
  });
}

function mapManualImportItem(item: ArrManualImport): QueueManualImportItem | null {
  if (!item.path || item.id == null) return null;
  const episodeIds =
    item.episodeIds ??
    (item.episodes ?? []).map((e) => e.id).filter((id): id is number => typeof id === "number");
  const epLabels = (item.episodes ?? [])
    .map((e) => {
      if (e.seasonNumber == null || e.episodeNumber == null) return e.title;
      return `${e.seasonNumber}x${String(e.episodeNumber).padStart(2, "0")}${e.title ? ` - ${e.title}` : ""}`;
    })
    .filter(Boolean);

  return {
    id: item.id,
    path: item.path,
    relativePath: item.relativePath,
    name: item.name,
    size: item.size,
    downloadId: item.downloadId,
    movieId: item.movieId ?? item.movie?.id,
    movieTitle: item.movie?.title,
    seriesId: item.seriesId ?? item.series?.id,
    seriesTitle: item.series?.title,
    seasonNumber: item.seasonNumber,
    episodeIds,
    episodeLabel: epLabels.join(", ") || undefined,
    artistId: item.artistId ?? item.artist?.id,
    artistName: item.artist?.artistName ?? item.artist?.name,
    albumId: item.albumId ?? item.album?.id,
    albumTitle: item.album?.title,
    quality: item.quality?.quality?.id
      ? {
          quality: {
            id: item.quality.quality.id,
            name: item.quality.quality.name ?? `Quality ${item.quality.quality.id}`,
            source: item.quality.quality.source,
            resolution: item.quality.quality.resolution,
            modifier: item.quality.quality.modifier,
          },
          revision: {
            version: item.quality.revision?.version ?? 1,
            real: item.quality.revision?.real ?? 0,
            isRepack: item.quality.revision?.isRepack ?? false,
          },
        }
      : undefined,
    qualityName: qualityName(item.quality),
    languages: (item.languages ?? [])
      .filter((l): l is { id: number; name: string } => l.id != null && Boolean(l.name))
      .map((l) => ({ id: l.id, name: l.name })),
    releaseGroup: item.releaseGroup,
    indexerFlags: item.indexerFlags ?? 0,
    releaseType: item.releaseType,
    rejections: (item.rejections ?? []).map((r) => ({ reason: r.reason, type: r.type })),
  };
}

export async function fetchManualImport(
  instances: Instance[],
  instanceId: string,
  options: { downloadId?: string; folder?: string },
): Promise<QueueManualImportItem[]> {
  const instance = requireArrInstance(instances, instanceId);
  const kind = instance.kind as ArrKind;
  const params = new URLSearchParams({ filterExistingFiles: "true" });
  if (options.downloadId) params.set("downloadId", options.downloadId);
  if (options.folder) params.set("folder", options.folder);
  const rows = await arrJson<ArrManualImport[]>(
    instance,
    `${apiBase(kind)}/manualimport?${params}`,
    { timeoutMs: 60_000 },
  );
  return rows.map(mapManualImportItem).filter((r): r is QueueManualImportItem => r != null);
}

export async function postManualImport(
  instances: Instance[],
  instanceId: string,
  files: QueueManualImportUpdateItem[],
): Promise<void> {
  const instance = requireArrInstance(instances, instanceId);
  const kind = instance.kind as ArrKind;
  const body = files.map((f) => {
    const row: Record<string, unknown> = {
      id: f.id,
      path: f.path,
    };
    if (f.downloadId) row.downloadId = f.downloadId;
    if (f.movieId != null) row.movieId = f.movieId;
    if (f.seriesId != null) row.seriesId = f.seriesId;
    if (f.seasonNumber != null) row.seasonNumber = f.seasonNumber;
    if (f.episodeIds) {
      row.episodeIds = f.episodeIds;
      row.episodes = f.episodeIds.map((id) => ({ id }));
    }
    if (f.artistId != null) row.artistId = f.artistId;
    if (f.albumId != null) row.albumId = f.albumId;
    if (f.quality) row.quality = f.quality;
    if (f.languages) row.languages = f.languages;
    if (f.releaseGroup != null) row.releaseGroup = f.releaseGroup;
    if (f.indexerFlags != null) row.indexerFlags = f.indexerFlags;
    if (f.releaseType) row.releaseType = f.releaseType;
    return row;
  });
  await arrJson(instance, `${apiBase(kind)}/manualimport`, {
    method: "POST",
    body,
    timeoutMs: 60_000,
  });
}
