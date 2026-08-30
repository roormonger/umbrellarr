import type { QueryClient } from "@tanstack/react-query";
import { listArtists, type ArtistsResponse } from "./artists";
import { listMovies, type MoviesResponse } from "./movies";
import { listShows, type ShowsResponse } from "./shows";

export const LIBRARY_HEAD_SIZE = 60;
export const LIBRARY_HEAD_STALE_MS = 30 * 60_000;
export const LIBRARY_HEAD_GC_MS = 60 * 60_000;
export const LIBRARY_FULL_STALE_MS = 5 * 60_000;
export const LIBRARY_FULL_GC_MS = 30 * 60_000;

export function moviesHeadQueryKey(instanceId: string) {
  return ["movies", instanceId, "head"] as const;
}

export function moviesFullQueryKey(instanceId: string) {
  return ["movies", instanceId] as const;
}

export function showsHeadQueryKey(instanceId: string) {
  return ["shows", instanceId, "head"] as const;
}

export function showsFullQueryKey(instanceId: string) {
  return ["shows", instanceId] as const;
}

export function artistsHeadQueryKey(instanceId: string) {
  return ["artists", instanceId, "head"] as const;
}

export function artistsFullQueryKey(instanceId: string) {
  return ["artists", instanceId] as const;
}

export function pickLibraryListData<T>(
  full: { data: T | undefined; isPlaceholderData: boolean },
  head: { data: T | undefined },
): { data: T | undefined; showingHead: boolean; showingPrevious: boolean } {
  if (full.data && !full.isPlaceholderData) {
    return { data: full.data, showingHead: false, showingPrevious: false };
  }
  if (head.data) {
    return { data: head.data, showingHead: true, showingPrevious: false };
  }
  if (full.data) {
    return { data: full.data, showingHead: false, showingPrevious: true };
  }
  return { data: undefined, showingHead: false, showingPrevious: false };
}

function sliceMoviesHead(res: MoviesResponse): MoviesResponse {
  const total = res.total ?? res.movies.length;
  const movies = res.movies.slice(0, LIBRARY_HEAD_SIZE);
  return {
    ...res,
    movies,
    count: movies.length,
    total,
    truncated: movies.length < total,
  };
}

function sliceShowsHead(res: ShowsResponse): ShowsResponse {
  const total = res.total ?? res.series.length;
  const series = res.series.slice(0, LIBRARY_HEAD_SIZE);
  return {
    ...res,
    series,
    count: series.length,
    total,
    truncated: series.length < total,
  };
}

function sliceArtistsHead(res: ArtistsResponse): ArtistsResponse {
  const total = res.total ?? res.artists.length;
  const artists = res.artists.slice(0, LIBRARY_HEAD_SIZE);
  return {
    ...res,
    artists,
    count: artists.length,
    total,
    truncated: artists.length < total,
  };
}

export async function fetchMoviesHead(instanceId: string) {
  return listMovies(instanceId, { limit: LIBRARY_HEAD_SIZE });
}

export async function fetchMoviesFull(
  queryClient: QueryClient,
  instanceId: string,
  options?: { refresh?: boolean },
) {
  const res = await listMovies(instanceId, options);
  queryClient.setQueryData(moviesHeadQueryKey(instanceId), sliceMoviesHead(res));
  return res;
}

export async function fetchShowsHead(instanceId: string) {
  return listShows(instanceId, { limit: LIBRARY_HEAD_SIZE });
}

export async function fetchShowsFull(
  queryClient: QueryClient,
  instanceId: string,
  options?: { refresh?: boolean },
) {
  const res = await listShows(instanceId, options);
  queryClient.setQueryData(showsHeadQueryKey(instanceId), sliceShowsHead(res));
  return res;
}

export async function fetchArtistsHead(instanceId: string) {
  return listArtists(instanceId, { limit: LIBRARY_HEAD_SIZE });
}

export async function fetchArtistsFull(
  queryClient: QueryClient,
  instanceId: string,
  options?: { refresh?: boolean },
) {
  const res = await listArtists(instanceId, options);
  queryClient.setQueryData(artistsHeadQueryKey(instanceId), sliceArtistsHead(res));
  return res;
}

export function prefetchMovieLibrary(queryClient: QueryClient, instanceId: string) {
  void queryClient.prefetchQuery({
    queryKey: moviesHeadQueryKey(instanceId),
    queryFn: () => fetchMoviesHead(instanceId),
    staleTime: LIBRARY_HEAD_STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: moviesFullQueryKey(instanceId),
    queryFn: () => fetchMoviesFull(queryClient, instanceId),
    staleTime: LIBRARY_FULL_STALE_MS,
  });
}

export function prefetchShowLibrary(queryClient: QueryClient, instanceId: string) {
  void queryClient.prefetchQuery({
    queryKey: showsHeadQueryKey(instanceId),
    queryFn: () => fetchShowsHead(instanceId),
    staleTime: LIBRARY_HEAD_STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: showsFullQueryKey(instanceId),
    queryFn: () => fetchShowsFull(queryClient, instanceId),
    staleTime: LIBRARY_FULL_STALE_MS,
  });
}

export function prefetchArtistLibrary(queryClient: QueryClient, instanceId: string) {
  void queryClient.prefetchQuery({
    queryKey: artistsHeadQueryKey(instanceId),
    queryFn: () => fetchArtistsHead(instanceId),
    staleTime: LIBRARY_HEAD_STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: artistsFullQueryKey(instanceId),
    queryFn: () => fetchArtistsFull(queryClient, instanceId),
    staleTime: LIBRARY_FULL_STALE_MS,
  });
}

export function prefetchMovieHead(queryClient: QueryClient, instanceId: string) {
  void queryClient.prefetchQuery({
    queryKey: moviesHeadQueryKey(instanceId),
    queryFn: () => fetchMoviesHead(instanceId),
    staleTime: LIBRARY_HEAD_STALE_MS,
  });
}

export function prefetchShowHead(queryClient: QueryClient, instanceId: string) {
  void queryClient.prefetchQuery({
    queryKey: showsHeadQueryKey(instanceId),
    queryFn: () => fetchShowsHead(instanceId),
    staleTime: LIBRARY_HEAD_STALE_MS,
  });
}

export function prefetchArtistHead(queryClient: QueryClient, instanceId: string) {
  void queryClient.prefetchQuery({
    queryKey: artistsHeadQueryKey(instanceId),
    queryFn: () => fetchArtistsHead(instanceId),
    staleTime: LIBRARY_HEAD_STALE_MS,
  });
}

export async function ensureMovieLibrary(queryClient: QueryClient, instanceId: string) {
  void queryClient.prefetchQuery({
    queryKey: moviesFullQueryKey(instanceId),
    queryFn: () => fetchMoviesFull(queryClient, instanceId),
    staleTime: LIBRARY_FULL_STALE_MS,
  });
  await queryClient.ensureQueryData({
    queryKey: moviesHeadQueryKey(instanceId),
    queryFn: () => fetchMoviesHead(instanceId),
    staleTime: LIBRARY_HEAD_STALE_MS,
  });
}

export async function ensureShowLibrary(queryClient: QueryClient, instanceId: string) {
  void queryClient.prefetchQuery({
    queryKey: showsFullQueryKey(instanceId),
    queryFn: () => fetchShowsFull(queryClient, instanceId),
    staleTime: LIBRARY_FULL_STALE_MS,
  });
  await queryClient.ensureQueryData({
    queryKey: showsHeadQueryKey(instanceId),
    queryFn: () => fetchShowsHead(instanceId),
    staleTime: LIBRARY_HEAD_STALE_MS,
  });
}

export async function ensureArtistLibrary(queryClient: QueryClient, instanceId: string) {
  void queryClient.prefetchQuery({
    queryKey: artistsFullQueryKey(instanceId),
    queryFn: () => fetchArtistsFull(queryClient, instanceId),
    staleTime: LIBRARY_FULL_STALE_MS,
  });
  await queryClient.ensureQueryData({
    queryKey: artistsHeadQueryKey(instanceId),
    queryFn: () => fetchArtistsHead(instanceId),
    staleTime: LIBRARY_HEAD_STALE_MS,
  });
}
