/**
 * Seerr issue list.
 * Upstream: GET /api/v1/issue, GET /movie|/tv/{tmdbId} for enrichment.
 */
import type {
  Instance,
  IssueListItem,
  IssueListQuery,
  IssueListResponse,
  IssueSort,
  IssueStatus,
  IssueType,
  RequestSortDirection,
  UnifiedIssueListQuery,
  UnifiedIssueListResponse,
} from "@umbrellarr/shared";
import { arrJson } from "./client.js";

type SeerrUser = {
  id: number;
  displayName?: string;
  username?: string;
  email?: string;
  avatar?: string;
};

type SeerrMedia = {
  tmdbId?: number;
  mediaType?: "movie" | "tv";
};

type SeerrIssueComment = {
  id?: number;
  message?: string;
  user?: SeerrUser;
};

type SeerrIssue = {
  id: number;
  status?: number;
  issueType?: number;
  problemSeason?: number;
  problemEpisode?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: SeerrUser;
  media?: SeerrMedia;
  comments?: SeerrIssueComment[];
};

type SeerrIssueList = {
  pageInfo?: {
    page?: number;
    pageSize?: number;
    pages?: number;
    results?: number;
  };
  results?: SeerrIssue[];
};

type SeerrMovie = {
  title?: string;
  releaseDate?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
};

type SeerrTv = {
  name?: string;
  firstAirDate?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
};

function requireSeerr(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) throw new Error(`Instance ${instanceId} not found`);
  if (instance.kind !== "seerr") {
    throw new Error(`Instance ${instanceId} is not a Seerr client`);
  }
  return instance;
}

function mapIssueStatus(value?: number): IssueStatus {
  switch (value) {
    case 1:
      return "open";
    case 2:
      return "resolved";
    default:
      return "unknown";
  }
}

function mapIssueType(value?: number): IssueType {
  switch (value) {
    case 1:
      return "video";
    case 2:
      return "audio";
    case 3:
      return "subtitles";
    case 4:
      return "other";
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

async function fetchTitle(
  instance: Instance,
  mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<SeerrMovie | SeerrTv | null> {
  try {
    if (mediaType === "movie") {
      return await arrJson<SeerrMovie>(instance, `/api/v1/movie/${tmdbId}`);
    }
    return await arrJson<SeerrTv>(instance, `/api/v1/tv/${tmdbId}`);
  } catch {
    return null;
  }
}

function mapIssue(
  issue: SeerrIssue,
  title: SeerrMovie | SeerrTv | null,
): IssueListItem {
  const mediaType = issue.media?.mediaType === "tv" ? "tv" : "movie";
  const tmdbId = issue.media?.tmdbId ?? 0;
  const movie = mediaType === "movie" ? title : null;
  const tv = mediaType === "tv" ? title : null;
  const name =
    (movie as SeerrMovie | null)?.title?.trim() ||
    (tv as SeerrTv | null)?.name?.trim() ||
    (tmdbId ? `TMDB ${tmdbId}` : `Issue ${issue.id}`);
  const year =
    yearFromDate((movie as SeerrMovie | null)?.releaseDate) ||
    yearFromDate((tv as SeerrTv | null)?.firstAirDate) ||
    undefined;
  const posterPath = (movie as SeerrMovie | null)?.posterPath ?? (tv as SeerrTv | null)?.posterPath;
  const backdropPath =
    (movie as SeerrMovie | null)?.backdropPath ?? (tv as SeerrTv | null)?.backdropPath;
  const sortedComments = [...(issue.comments ?? [])].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

  return {
    id: issue.id,
    mediaType,
    tmdbId,
    title: name,
    year,
    posterUrl: tmdbImageUrl("w600_and_h900_bestv2", posterPath),
    backdropUrl: tmdbImageUrl("w1920_and_h800_multi_faces", backdropPath),
    status: mapIssueStatus(issue.status),
    issueType: mapIssueType(issue.issueType),
    message: sortedComments[0]?.message?.trim() || undefined,
    problemSeason: issue.problemSeason ?? 0,
    problemEpisode: issue.problemEpisode ?? 0,
    createdAt: issue.createdAt ?? new Date(0).toISOString(),
    updatedAt: issue.updatedAt,
    createdBy: mapUser(issue.createdBy),
  };
}

function sortIssueItems(
  items: IssueListItem[],
  sort: IssueSort,
  sortDirection: RequestSortDirection,
): IssueListItem[] {
  const dir = sortDirection === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const aTime = new Date(sort === "modified" ? (a.updatedAt ?? a.createdAt) : a.createdAt).getTime();
    const bTime = new Date(sort === "modified" ? (b.updatedAt ?? b.createdAt) : b.createdAt).getTime();
    return (aTime - bTime) * dir;
  });
}

export async function listMediaIssues(
  instances: Instance[],
  instanceId: string,
  query: IssueListQuery,
): Promise<IssueListResponse> {
  const instance = requireSeerr(instances, instanceId);
  const params = new URLSearchParams({
    take: String(query.take),
    skip: String(query.skip),
    filter: query.filter,
    sort: query.sort,
  });
  const payload = await arrJson<SeerrIssueList>(
    instance,
    `/api/v1/issue?${params.toString()}`,
  );
  const results = payload.results ?? [];
  const enriched = await Promise.all(
    results.map(async (issue) => {
      const mediaType = issue.media?.mediaType === "tv" ? "tv" : "movie";
      const tmdbId = issue.media?.tmdbId;
      if (tmdbId == null) return mapIssue(issue, null);
      const title = await fetchTitle(instance, mediaType, tmdbId);
      return mapIssue(issue, title);
    }),
  );

  const sorted =
    query.sortDirection === "asc" ? sortIssueItems(enriched, query.sort, "asc") : enriched;

  const pageInfo = payload.pageInfo ?? {};
  return {
    pageInfo: {
      page: pageInfo.page ?? 1,
      pageSize: pageInfo.pageSize ?? query.take,
      pages: pageInfo.pages ?? 1,
      results: pageInfo.results ?? sorted.length,
    },
    results: sorted.map((item) => ({
      ...item,
      instanceId: instance.id,
      instanceName: instance.name,
    })),
  };
}

export async function listUnifiedMediaIssues(
  instances: Instance[],
  query: UnifiedIssueListQuery,
): Promise<UnifiedIssueListResponse> {
  const seerrInstances = instances.filter((instance) => instance.kind === "seerr");
  const targets = query.instanceId
    ? seerrInstances.filter((instance) => instance.id === query.instanceId)
    : seerrInstances;

  if (query.instanceId && targets.length === 0) {
    throw new Error(`Seerr instance not found: ${query.instanceId}`);
  }

  if (targets.length === 0) {
    return {
      pageInfo: { page: 1, pageSize: query.take, pages: 1, results: 0 },
      results: [],
    };
  }

  if (targets.length === 1) {
    return listMediaIssues(instances, targets[0]!.id, query);
  }

  const fetchTake = Math.min(100, query.take + query.skip);
  const fetchQuery: IssueListQuery = { ...query, take: fetchTake, skip: 0 };

  const settled = await Promise.allSettled(
    targets.map((instance) => listMediaIssues(instances, instance.id, fetchQuery)),
  );

  const merged: IssueListItem[] = [];
  const errors: NonNullable<UnifiedIssueListResponse["errors"]> = [];
  let totalRecords = 0;

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]!;
    const instance = targets[i]!;
    if (result.status === "fulfilled") {
      merged.push(...result.value.results);
      totalRecords += result.value.pageInfo.results;
    } else {
      const message =
        result.reason instanceof Error ? result.reason.message : "Issue fetch failed";
      errors.push({
        instanceId: instance.id,
        instanceName: instance.name,
        message,
      });
    }
  }

  const sorted = sortIssueItems(merged, query.sort, query.sortDirection);
  const results = sorted.slice(query.skip, query.skip + query.take);
  const pages = Math.max(1, Math.ceil(totalRecords / query.take));

  return {
    pageInfo: {
      page: Math.floor(query.skip / query.take) + 1,
      pageSize: query.take,
      pages,
      results: totalRecords,
    },
    results,
    errors: errors.length > 0 ? errors : undefined,
  };
}

type SeerrIssueCounts = {
  open?: number;
  closed?: number;
  total?: number;
};

export async function getIssueCount(
  instances: Instance[],
  instanceId: string,
): Promise<SeerrIssueCounts> {
  const instance = requireSeerr(instances, instanceId);
  return arrJson<SeerrIssueCounts>(instance, "/api/v1/issue/count");
}

export async function getUnifiedOpenIssueCount(instances: Instance[]): Promise<number> {
  const seerrInstances = instances.filter((instance) => instance.kind === "seerr");
  if (seerrInstances.length === 0) return 0;

  const settled = await Promise.allSettled(
    seerrInstances.map((instance) => getIssueCount(instances, instance.id)),
  );

  let total = 0;
  for (const result of settled) {
    if (result.status === "fulfilled") {
      total += result.value.open ?? 0;
    }
  }
  return total;
}
