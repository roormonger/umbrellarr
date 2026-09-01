import type {
  MovieAddRequest,
  MovieBlocklistItem,
  MovieDetail,
  MovieEditOptions,
  MovieFileBulkUpdateItem,
  MovieHistoryEvent,
  MovieIndexerFlagOption,
  MovieLanguageOption,
  MovieLink,
  MovieListItem,
  MovieLookupItem,
  MovieManageFile,
  MovieNamingConfig,
  MoviePageDetail,
  MovieQualityOption,
  MovieRelease,
  MovieReleaseGrabRequest,
  MovieRenamePreview,
  MovieUpdateRequest,
} from "@umbrellarr/shared";
import type { CacheStatus } from "@umbrellarr/shared";
import { api } from "./client";

export type MoviesResponse = {
  movies: MovieListItem[];
  count: number;
  total?: number;
  truncated?: boolean;
  cache?: CacheStatus;
  fetchedAt?: string;
};

export function listMovies(
  instanceId?: string,
  options?: { refresh?: boolean; limit?: number },
) {
  const params = new URLSearchParams();
  if (instanceId) params.set("instanceId", instanceId);
  if (options?.refresh) params.set("refresh", "true");
  if (options?.limit != null) params.set("limit", String(options.limit));
  const encoded = params.toString();
  const query = encoded ? `?${encoded}` : "";
  return api<MoviesResponse>(`/api/movies${query}`);
}

export function getMovieDetail(instanceId: string, movieId: number) {
  return api<MoviePageDetail>(`/api/movies/${encodeURIComponent(instanceId)}/${movieId}`);
}

export function getMovieEditOptions(instanceId: string) {
  return api<MovieEditOptions>(`/api/movies/${encodeURIComponent(instanceId)}/options`);
}

export function lookupMovies(instanceId: string, term: string) {
  const params = new URLSearchParams({ term });
  return api<{ results: MovieLookupItem[] }>(
    `/api/movies/${encodeURIComponent(instanceId)}/lookup?${params}`,
  );
}

export function addMovie(instanceId: string, body: MovieAddRequest) {
  return api<MovieDetail>(`/api/movies/${encodeURIComponent(instanceId)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getMovieLinks(instanceId: string, movieId: number) {
  return api<{ links: MovieLink[] }>(
    `/api/movies/${encodeURIComponent(instanceId)}/${movieId}/links`,
  );
}

export function refreshMovie(instanceId: string, movieId: number) {
  return api<{ ok: true }>(`/api/movies/${encodeURIComponent(instanceId)}/${movieId}/refresh`, {
    method: "POST",
  });
}

export function searchMovie(instanceId: string, movieId: number) {
  return api<{ ok: true }>(`/api/movies/${encodeURIComponent(instanceId)}/${movieId}/search`, {
    method: "POST",
  });
}

export function getMovieHistory(instanceId: string, movieId: number) {
  return api<{ events: MovieHistoryEvent[] }>(
    `/api/movies/${encodeURIComponent(instanceId)}/${movieId}/history`,
  );
}

export function markMovieHistoryFailed(instanceId: string, historyId: number) {
  return api<{ ok: true }>(
    `/api/movies/${encodeURIComponent(instanceId)}/history/${historyId}/failed`,
    { method: "POST" },
  );
}

export function getMovieReleases(instanceId: string, movieId: number) {
  return api<{ releases: MovieRelease[] }>(
    `/api/movies/${encodeURIComponent(instanceId)}/${movieId}/releases`,
  );
}

export function getMovieBlocklist(instanceId: string, movieId: number) {
  return api<{ items: MovieBlocklistItem[] }>(
    `/api/movies/${encodeURIComponent(instanceId)}/${movieId}/blocklist`,
  );
}

export function grabMovieRelease(instanceId: string, body: MovieReleaseGrabRequest) {
  return api<{ ok: true }>(`/api/movies/${encodeURIComponent(instanceId)}/releases/grab`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getMovieNamingConfig(instanceId: string) {
  return api<MovieNamingConfig>(`/api/movies/${encodeURIComponent(instanceId)}/naming`);
}

export function getMovieRenamePreview(instanceId: string, movieId: number) {
  return api<{ items: MovieRenamePreview[] }>(
    `/api/movies/${encodeURIComponent(instanceId)}/${movieId}/rename`,
  );
}

export function organizeMovieFiles(instanceId: string, movieId: number, files: number[]) {
  return api<{ ok: true }>(
    `/api/movies/${encodeURIComponent(instanceId)}/${movieId}/organize`,
    {
      method: "POST",
      body: JSON.stringify({ files }),
    },
  );
}

export function getMovieManageFiles(instanceId: string, movieId: number) {
  return api<{ files: MovieManageFile[] }>(
    `/api/movies/${encodeURIComponent(instanceId)}/${movieId}/files`,
  );
}

export function getMovieQualities(instanceId: string) {
  return api<{ qualities: MovieQualityOption[] }>(
    `/api/movies/${encodeURIComponent(instanceId)}/qualities`,
  );
}

export function getMovieLanguages(instanceId: string) {
  return api<{ languages: MovieLanguageOption[] }>(
    `/api/movies/${encodeURIComponent(instanceId)}/languages`,
  );
}

export function getMovieIndexerFlags(instanceId: string) {
  return api<{ flags: MovieIndexerFlagOption[] }>(
    `/api/movies/${encodeURIComponent(instanceId)}/indexer-flags`,
  );
}

export function bulkUpdateMovieFiles(instanceId: string, files: MovieFileBulkUpdateItem[]) {
  return api<{ ok: true }>(`/api/movies/${encodeURIComponent(instanceId)}/files/bulk`, {
    method: "PUT",
    body: JSON.stringify({ files }),
  });
}

export function bulkDeleteMovieFiles(instanceId: string, movieFileIds: number[]) {
  return api<{ ok: true }>(`/api/movies/${encodeURIComponent(instanceId)}/files/bulk`, {
    method: "DELETE",
    body: JSON.stringify({ movieFileIds }),
  });
}

export function updateMovie(instanceId: string, movieId: number, body: MovieUpdateRequest) {
  return api<MovieDetail>(`/api/movies/${encodeURIComponent(instanceId)}/${movieId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteMovie(instanceId: string, movieId: number, deleteFiles = false) {
  const q = deleteFiles ? "?deleteFiles=true" : "";
  return api<{ ok: true }>(`/api/movies/${encodeURIComponent(instanceId)}/${movieId}${q}`, {
    method: "DELETE",
  });
}
