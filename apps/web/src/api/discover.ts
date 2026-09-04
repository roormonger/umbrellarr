import type {
  DiscoverHomeResponse,
  DiscoverListResponse,
  DiscoverSearchResponse,
  DiscoverTitleResponse,
} from "@umbrellarr/shared";
import { api } from "./client";

export function getDiscoverHome(instanceId: string) {
  return api<DiscoverHomeResponse>(`/api/discover/${encodeURIComponent(instanceId)}/home`);
}

export function searchDiscover(instanceId: string, query: string, page = 1) {
  const search = new URLSearchParams({ query, page: String(page) });
  return api<DiscoverSearchResponse>(
    `/api/discover/${encodeURIComponent(instanceId)}/search?${search}`,
  );
}

export function listDiscoverMovies(
  instanceId: string,
  params: {
    page?: number;
    genre?: string;
    studio?: string;
    sortBy?: string;
    upcoming?: boolean;
  } = {},
) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.genre) search.set("genre", params.genre);
  if (params.studio) search.set("studio", params.studio);
  if (params.sortBy) search.set("sortBy", params.sortBy);
  if (params.upcoming) search.set("upcoming", "true");
  const suffix = search.toString() ? `?${search}` : "";
  return api<DiscoverListResponse>(
    `/api/discover/${encodeURIComponent(instanceId)}/movies${suffix}`,
  );
}

export function listDiscoverTv(
  instanceId: string,
  params: {
    page?: number;
    genre?: string;
    network?: string;
    sortBy?: string;
    upcoming?: boolean;
  } = {},
) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.genre) search.set("genre", params.genre);
  if (params.network) search.set("network", params.network);
  if (params.sortBy) search.set("sortBy", params.sortBy);
  if (params.upcoming) search.set("upcoming", "true");
  const suffix = search.toString() ? `?${search}` : "";
  return api<DiscoverListResponse>(`/api/discover/${encodeURIComponent(instanceId)}/tv${suffix}`);
}

export function getDiscoverTitle(
  instanceId: string,
  mediaType: "movie" | "tv",
  tmdbId: number,
) {
  return api<DiscoverTitleResponse>(
    `/api/discover/${encodeURIComponent(instanceId)}/title/${mediaType}/${tmdbId}`,
  );
}
