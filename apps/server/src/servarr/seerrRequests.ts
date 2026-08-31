/**
 * Seerr request list / approve / edit.
 * Upstream: GET/PUT /api/v1/request*, POST /request/{id}/approve|decline,
 * GET /service/radarr|sonarr, GET /user, GET /movie|/tv/{tmdbId}
 */
import type {
  Instance,
  MediaRequestItem,
  MediaRequestListResponse,
  RequestEditDetail,
  RequestListQuery,
  RequestSeason,
  RequestStatus,
  RequestUpdateBody,
  SeerrServiceDetail,
  SeerrServiceServer,
} from "@umbrellarr/shared";
import { arrJson } from "./client.js";

type SeerrUser = {
  id: number;
  displayName?: string;
  username?: string;
  email?: string;
  avatar?: string;
};

type SeerrSeasonRequest = {
  seasonNumber?: number;
  status?: number;
};

type SeerrMedia = {
  tmdbId?: number;
  status?: number;
  status4k?: number;
  mediaType?: "movie" | "tv";
};

type SeerrRequest = {
  id: number;
  status?: number;
  type?: "movie" | "tv";
  is4k?: boolean;
  createdAt?: string;
  updatedAt?: string;
  serverId?: number | null;
  profileId?: number | null;
  rootFolder?: string | null;
  languageProfileId?: number | null;
  tags?: number[] | null;
  seasons?: SeerrSeasonRequest[];
  requestedBy?: SeerrUser;
  media?: SeerrMedia;
  profileName?: string;
};

type SeerrPageInfo = {
  page?: number;
  pageSize?: number;
  pages?: number;
  results?: number;
};

type SeerrRequestList = {
  pageInfo?: SeerrPageInfo;
  results?: SeerrRequest[];
};

type SeerrMovie = {
  id?: number;
  title?: string;
  releaseDate?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
};

type SeerrTv = {
  id?: number;
  name?: string;
  firstAirDate?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  seasons?: Array<{
    seasonNumber?: number;
    episodeCount?: number;
    name?: string;
  }>;
};

type SeerrServiceCommon = {
  id: number;
  name?: string;
  is4k?: boolean;
  isDefault?: boolean;
  activeProfileId?: number;
  activeDirectory?: string;
  activeLanguageProfileId?: number;
  activeTags?: number[];
};

function requireSeerr(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) throw new Error(`Instance ${instanceId} not found`);
  if (instance.kind !== "seerr") {
    throw new Error(`Instance ${instanceId} is not a Seerr client`);
  }
  return instance;
}

function mapRequestStatus(value?: number): RequestStatus {
  switch (value) {
    case 1:
      return "pending";
    case 2:
      return "approved";
    case 3:
      return "declined";
    case 4:
      return "failed";
    case 5:
      return "completed";
    default:
      return "unknown";
  }
}

function tmdbImageUrl(size: string, path?: string | null): string | undefined {
  if (!path) return undefined;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `https://image.tmdb.org/t/p/${size}${normalized}`;
}

function yearFromDate(value?: string): string | undefined {
  if (!value || value.length < 4) return undefined;
  return value.slice(0, 4);
}

function mapUser(user?: SeerrUser) {
  if (!user?.id) return undefined;
  return {
    id: user.id,
    displayName: user.displayName?.trim() || user.username?.trim() || `User ${user.id}`,
    email: user.email,
    avatar: user.avatar,
  };
}

function mapSeasons(
  seasons: SeerrSeasonRequest[] | undefined,
  episodeCounts?: Map<number, number>,
): RequestSeason[] {
  return (seasons ?? [])
    .filter((s) => s.seasonNumber != null)
    .map((s) => ({
      seasonNumber: s.seasonNumber!,
      status: mapRequestStatus(s.status),
      episodeCount: episodeCounts?.get(s.seasonNumber!),
    }))
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
}

async function fetchTitle(
  instance: Instance,
  mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<{ title: SeerrMovie | SeerrTv | null; episodeCounts?: Map<number, number> }> {
  try {
    if (mediaType === "movie") {
      const title = await arrJson<SeerrMovie>(instance, `/api/v1/movie/${tmdbId}`);
      return { title };
    }
    const title = await arrJson<SeerrTv>(instance, `/api/v1/tv/${tmdbId}`);
    const episodeCounts = new Map<number, number>();
    for (const season of title.seasons ?? []) {
      if (season.seasonNumber != null && season.episodeCount != null) {
        episodeCounts.set(season.seasonNumber, season.episodeCount);
      }
    }
    return { title, episodeCounts };
  } catch {
    return { title: null };
  }
}

function mapItem(
  request: SeerrRequest,
  title: SeerrMovie | SeerrTv | null,
  episodeCounts?: Map<number, number>,
): MediaRequestItem {
  const mediaType =
    request.type === "tv" || request.media?.mediaType === "tv" ? "tv" : "movie";
  const tmdbId = request.media?.tmdbId ?? 0;
  const movie = mediaType === "movie" ? (title as SeerrMovie | null) : null;
  const tv = mediaType === "tv" ? (title as SeerrTv | null) : null;
  const name =
    movie?.title?.trim() ||
    tv?.name?.trim() ||
    (tmdbId ? `TMDB ${tmdbId}` : `Request ${request.id}`);
  const year =
    yearFromDate(movie?.releaseDate) || yearFromDate(tv?.firstAirDate) || undefined;
  const posterPath = movie?.posterPath ?? tv?.posterPath;
  const backdropPath = movie?.backdropPath ?? tv?.backdropPath;

  return {
    id: request.id,
    mediaType,
    status: mapRequestStatus(request.status),
    is4k: Boolean(request.is4k),
    createdAt: request.createdAt ?? new Date(0).toISOString(),
    updatedAt: request.updatedAt,
    tmdbId,
    title: name,
    year,
    posterUrl: tmdbImageUrl("w600_and_h900_bestv2", posterPath),
    backdropUrl: tmdbImageUrl("w1920_and_h800_multi_faces", backdropPath),
    seasons: mapSeasons(request.seasons, episodeCounts),
    requestedBy: mapUser(request.requestedBy),
    serverId: request.serverId ?? undefined,
    profileId: request.profileId ?? undefined,
    rootFolder: request.rootFolder ?? undefined,
    languageProfileId: request.languageProfileId ?? undefined,
    tags: request.tags ?? [],
    profileName: request.profileName,
  };
}

export async function listMediaRequests(
  instances: Instance[],
  instanceId: string,
  query: RequestListQuery,
): Promise<MediaRequestListResponse> {
  const instance = requireSeerr(instances, instanceId);
  const params = new URLSearchParams({
    take: String(query.take),
    skip: String(query.skip),
    filter: query.filter,
    mediaType: query.mediaType,
    sort: query.sort,
    sortDirection: query.sortDirection,
  });
  const payload = await arrJson<SeerrRequestList>(
    instance,
    `/api/v1/request?${params.toString()}`,
  );
  const results = payload.results ?? [];
  const enriched = await Promise.all(
    results.map(async (request) => {
      const mediaType =
        request.type === "tv" || request.media?.mediaType === "tv" ? "tv" : "movie";
      const tmdbId = request.media?.tmdbId;
      if (tmdbId == null) return mapItem(request, null);
      const { title, episodeCounts } = await fetchTitle(instance, mediaType, tmdbId);
      return mapItem(request, title, episodeCounts);
    }),
  );

  const pageInfo = payload.pageInfo ?? {};
  return {
    pageInfo: {
      page: pageInfo.page ?? 1,
      pageSize: pageInfo.pageSize ?? query.take,
      pages: pageInfo.pages ?? 1,
      results: pageInfo.results ?? enriched.length,
    },
    results: enriched,
  };
}

export async function getMediaRequestDetail(
  instances: Instance[],
  instanceId: string,
  requestId: number,
): Promise<RequestEditDetail> {
  const instance = requireSeerr(instances, instanceId);
  const request = await arrJson<SeerrRequest>(instance, `/api/v1/request/${requestId}`);
  const mediaType =
    request.type === "tv" || request.media?.mediaType === "tv" ? "tv" : "movie";
  const tmdbId = request.media?.tmdbId;
  const { title, episodeCounts } =
    tmdbId != null
      ? await fetchTitle(instance, mediaType, tmdbId)
      : { title: null, episodeCounts: undefined };

  const item = mapItem(request, title, episodeCounts);
  let seasonOptions: RequestSeason[] = item.seasons;

  if (mediaType === "tv" && title && "seasons" in title) {
    const tv = title as SeerrTv;
    const statusBySeason = new Map(item.seasons.map((s) => [s.seasonNumber, s.status]));
    seasonOptions = (tv.seasons ?? [])
      .filter((s) => s.seasonNumber != null && s.seasonNumber > 0)
      .map((s) => ({
        seasonNumber: s.seasonNumber!,
        status: statusBySeason.get(s.seasonNumber!) ?? "pending",
        episodeCount: s.episodeCount,
      }))
      .sort((a, b) => a.seasonNumber - b.seasonNumber);

    for (const season of item.seasons) {
      if (season.seasonNumber === 0 && !seasonOptions.some((s) => s.seasonNumber === 0)) {
        seasonOptions.unshift(season);
      }
    }
  }

  return { ...item, seasonOptions };
}

export async function approveMediaRequest(
  instances: Instance[],
  instanceId: string,
  requestId: number,
): Promise<void> {
  const instance = requireSeerr(instances, instanceId);
  await arrJson(instance, `/api/v1/request/${requestId}/approve`, { method: "POST" });
}

export async function declineMediaRequest(
  instances: Instance[],
  instanceId: string,
  requestId: number,
): Promise<void> {
  const instance = requireSeerr(instances, instanceId);
  await arrJson(instance, `/api/v1/request/${requestId}/decline`, { method: "POST" });
}

export async function updateMediaRequest(
  instances: Instance[],
  instanceId: string,
  requestId: number,
  body: RequestUpdateBody,
): Promise<MediaRequestItem> {
  const instance = requireSeerr(instances, instanceId);
  if (body.mediaType === "tv" && (!body.seasons || body.seasons.length === 0)) {
    throw new Error("Select at least one season before approving");
  }

  const payload: Record<string, unknown> = {
    mediaType: body.mediaType,
    serverId: body.serverId,
    profileId: body.profileId,
    rootFolder: body.rootFolder,
    userId: body.userId,
    tags: body.tags,
  };
  if (body.mediaType === "tv") {
    payload.seasons = body.seasons;
    if (body.languageProfileId != null) {
      payload.languageProfileId = body.languageProfileId;
    }
  }

  await arrJson<SeerrRequest>(instance, `/api/v1/request/${requestId}`, {
    method: "PUT",
    body: payload,
  });

  if (body.approve) {
    await arrJson(instance, `/api/v1/request/${requestId}/approve`, { method: "POST" });
  }

  return getMediaRequestDetail(instances, instanceId, requestId);
}

export async function listSeerrServices(
  instances: Instance[],
  instanceId: string,
  mediaType: "movie" | "tv",
): Promise<SeerrServiceServer[]> {
  const instance = requireSeerr(instances, instanceId);
  const path = mediaType === "movie" ? "/api/v1/service/radarr" : "/api/v1/service/sonarr";
  const servers = await arrJson<SeerrServiceCommon[]>(instance, path);
  return servers.map((server) => ({
    id: server.id,
    name: server.name ?? `Server ${server.id}`,
    is4k: server.is4k,
    isDefault: server.isDefault,
    activeProfileId: server.activeProfileId,
    activeDirectory: server.activeDirectory,
    activeLanguageProfileId: server.activeLanguageProfileId,
    activeTags: server.activeTags,
  }));
}

export async function getSeerrServiceDetail(
  instances: Instance[],
  instanceId: string,
  mediaType: "movie" | "tv",
  serverId: number,
): Promise<SeerrServiceDetail> {
  const instance = requireSeerr(instances, instanceId);
  const path =
    mediaType === "movie"
      ? `/api/v1/service/radarr/${serverId}`
      : `/api/v1/service/sonarr/${serverId}`;
  const detail = await arrJson<{
    server: SeerrServiceCommon;
    profiles?: Array<{ id: number; name?: string }>;
    rootFolders?: Array<{
      id?: number;
      path?: string;
      freeSpace?: number;
      totalSpace?: number;
    }>;
    tags?: Array<{ id: number; label?: string }>;
    languageProfiles?: Array<{ id: number; name?: string }> | null;
  }>(instance, path);

  return {
    server: {
      id: detail.server.id,
      name: detail.server.name ?? `Server ${detail.server.id}`,
      is4k: detail.server.is4k,
      isDefault: detail.server.isDefault,
      activeProfileId: detail.server.activeProfileId,
      activeDirectory: detail.server.activeDirectory,
      activeLanguageProfileId: detail.server.activeLanguageProfileId,
      activeTags: detail.server.activeTags,
    },
    profiles: (detail.profiles ?? []).map((p) => ({
      id: p.id,
      name: p.name ?? `Profile ${p.id}`,
    })),
    rootFolders: (detail.rootFolders ?? [])
      .filter((f): f is { id?: number; path: string; freeSpace?: number; totalSpace?: number } =>
        Boolean(f.path),
      )
      .map((f) => ({
        id: f.id,
        path: f.path,
        freeSpace: f.freeSpace,
        totalSpace: f.totalSpace,
      })),
    tags: (detail.tags ?? []).map((t) => ({
      id: t.id,
      label: t.label ?? String(t.id),
    })),
    languageProfiles: detail.languageProfiles
      ? detail.languageProfiles.map((p) => ({
          id: p.id,
          name: p.name ?? `Language ${p.id}`,
        }))
      : undefined,
  };
}

export async function listSeerrUsers(
  instances: Instance[],
  instanceId: string,
): Promise<Array<{ id: number; displayName: string; email?: string; avatar?: string }>> {
  const instance = requireSeerr(instances, instanceId);
  const payload = await arrJson<{ results?: SeerrUser[] }>(
    instance,
    "/api/v1/user?take=1000&sort=displayname",
  );
  return (payload.results ?? [])
    .filter((u) => u.id != null)
    .map((u) => ({
      id: u.id,
      displayName: u.displayName?.trim() || u.username?.trim() || `User ${u.id}`,
      email: u.email,
      avatar: u.avatar,
    }));
}

export async function getRequestCount(
  instances: Instance[],
  instanceId: string,
): Promise<Record<string, number>> {
  const instance = requireSeerr(instances, instanceId);
  return arrJson<Record<string, number>>(instance, "/api/v1/request/count");
}
