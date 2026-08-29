import type {
  SeriesBlocklistItem,
  SeriesDetail,
  SeriesEditOptions,
  SeriesFileBulkUpdateItem,
  SeriesHistoryEvent,
  SeriesIndexerFlagOption,
  SeriesLanguageOption,
  SeriesLink,
  SeriesListItem,
  SeriesManageFile,
  SeriesNamingConfig,
  SeriesPageDetail,
  SeriesQualityOption,
  SeriesRelease,
  SeriesReleaseGrabRequest,
  SeriesRenamePreview,
  SeriesUpdateRequest,
  CacheStatus,
} from "@umbrellarr/shared";
import { api } from "./client";

export type ShowsResponse = {
  series: SeriesListItem[];
  count: number;
  cache?: CacheStatus;
  fetchedAt?: string;
};

export function listShows(instanceId?: string) {
  const query = instanceId ? `?instanceId=${encodeURIComponent(instanceId)}` : "";
  return api<ShowsResponse>(`/api/shows${query}`);
}

export function getSeriesDetail(instanceId: string, seriesId: number) {
  return api<SeriesPageDetail>(`/api/shows/${encodeURIComponent(instanceId)}/${seriesId}`);
}

export function getSeriesEditOptions(instanceId: string) {
  return api<SeriesEditOptions>(`/api/shows/${encodeURIComponent(instanceId)}/options`);
}

export function getSeriesLinks(instanceId: string, seriesId: number) {
  return api<{ links: SeriesLink[] }>(
    `/api/shows/${encodeURIComponent(instanceId)}/${seriesId}/links`,
  );
}

export function getSeriesTrailer(instanceId: string, seriesId: number) {
  return api<{ youTubeTrailerId?: string }>(
    `/api/shows/${encodeURIComponent(instanceId)}/${seriesId}/trailer`,
  );
}

export function refreshSeries(instanceId: string, seriesId: number) {
  return api<{ ok: true }>(`/api/shows/${encodeURIComponent(instanceId)}/${seriesId}/refresh`, {
    method: "POST",
  });
}

export function searchSeries(instanceId: string, seriesId: number) {
  return api<{ ok: true }>(`/api/shows/${encodeURIComponent(instanceId)}/${seriesId}/search`, {
    method: "POST",
  });
}

export function updateSeries(instanceId: string, seriesId: number, body: SeriesUpdateRequest) {
  return api<SeriesDetail>(`/api/shows/${encodeURIComponent(instanceId)}/${seriesId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteSeries(instanceId: string, seriesId: number, deleteFiles = false) {
  const q = deleteFiles ? "?deleteFiles=true" : "";
  return api<{ ok: true }>(`/api/shows/${encodeURIComponent(instanceId)}/${seriesId}${q}`, {
    method: "DELETE",
  });
}

export function getSeriesHistory(instanceId: string, seriesId: number) {
  return api<{ events: SeriesHistoryEvent[] }>(
    `/api/shows/${encodeURIComponent(instanceId)}/${seriesId}/history`,
  );
}

export function markSeriesHistoryFailed(instanceId: string, historyId: number) {
  return api<{ ok: true }>(
    `/api/shows/${encodeURIComponent(instanceId)}/history/${historyId}/failed`,
    { method: "POST" },
  );
}

export function getSeriesReleases(instanceId: string, seriesId: number) {
  return api<{ releases: SeriesRelease[] }>(
    `/api/shows/${encodeURIComponent(instanceId)}/${seriesId}/releases`,
  );
}

export function getSeriesBlocklist(instanceId: string, seriesId: number) {
  return api<{ items: SeriesBlocklistItem[] }>(
    `/api/shows/${encodeURIComponent(instanceId)}/${seriesId}/blocklist`,
  );
}

export function grabSeriesRelease(instanceId: string, body: SeriesReleaseGrabRequest) {
  return api<{ ok: true }>(`/api/shows/${encodeURIComponent(instanceId)}/releases/grab`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getSeriesNamingConfig(instanceId: string) {
  return api<SeriesNamingConfig>(`/api/shows/${encodeURIComponent(instanceId)}/naming`);
}

export function getSeriesRenamePreview(instanceId: string, seriesId: number) {
  return api<{ items: SeriesRenamePreview[] }>(
    `/api/shows/${encodeURIComponent(instanceId)}/${seriesId}/rename`,
  );
}

export function organizeSeriesFiles(instanceId: string, seriesId: number, files: number[]) {
  return api<{ ok: true }>(
    `/api/shows/${encodeURIComponent(instanceId)}/${seriesId}/organize`,
    {
      method: "POST",
      body: JSON.stringify({ files }),
    },
  );
}

export function getSeriesManageFiles(instanceId: string, seriesId: number) {
  return api<{ files: SeriesManageFile[] }>(
    `/api/shows/${encodeURIComponent(instanceId)}/${seriesId}/files`,
  );
}

export function getSeriesQualities(instanceId: string) {
  return api<{ qualities: SeriesQualityOption[] }>(
    `/api/shows/${encodeURIComponent(instanceId)}/qualities`,
  );
}

export function getSeriesLanguages(instanceId: string) {
  return api<{ languages: SeriesLanguageOption[] }>(
    `/api/shows/${encodeURIComponent(instanceId)}/languages`,
  );
}

export function getSeriesIndexerFlags(instanceId: string) {
  return api<{ flags: SeriesIndexerFlagOption[] }>(
    `/api/shows/${encodeURIComponent(instanceId)}/indexer-flags`,
  );
}

export function bulkUpdateSeriesFiles(instanceId: string, files: SeriesFileBulkUpdateItem[]) {
  return api<{ ok: true }>(`/api/shows/${encodeURIComponent(instanceId)}/files/bulk`, {
    method: "PUT",
    body: JSON.stringify({ files }),
  });
}

export function bulkDeleteSeriesFiles(instanceId: string, episodeFileIds: number[]) {
  return api<{ ok: true }>(`/api/shows/${encodeURIComponent(instanceId)}/files/bulk`, {
    method: "DELETE",
    body: JSON.stringify({ episodeFileIds }),
  });
}
