/**
 * Seerr Discover home / browse / search.
 * Upstream: GET /api/v1/discover/*, /search, /movie|/tv/{tmdbId}
 * Studio/network tiles: cite Seerr StudioSlider / NetworkSlider.
 */
import type {
  DiscoverCard,
  DiscoverCompanyTile,
  DiscoverFeaturedItem,
  DiscoverGenreTile,
  DiscoverHomeResponse,
  DiscoverListQuery,
  DiscoverListResponse,
  DiscoverRow,
  DiscoverSearchResponse,
  DiscoverTitleResponse,
  Instance,
  SeerrMediaAvailability,
} from "@umbrellarr/shared";
import { activityListCache } from "../cache/ttlCache.js";
import { arrJson } from "./client.js";
import { getSeerrTitleDetail } from "./seerrRequests.js";

type SeerrMediaRequestRef = {
  id?: number;
  is4k?: boolean;
  /** MediaRequestStatus: 1 pending, 2 approved, … */
  status?: number;
};

type SeerrMediaInfo = {
  status?: number | string;
  status4k?: number | string;
  downloadStatus?: unknown[];
  requests?: SeerrMediaRequestRef[];
};

type SeerrDiscoverResult = {
  id?: number;
  mediaType?: string;
  title?: string;
  name?: string;
  overview?: string;
  releaseDate?: string;
  firstAirDate?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  mediaInfo?: SeerrMediaInfo;
};

type SeerrDiscoverPage = {
  page?: number;
  totalPages?: number;
  totalResults?: number;
  results?: SeerrDiscoverResult[];
};

type SeerrGenreSliderItem = {
  id?: number;
  name?: string;
  backdrops?: string[];
};

/** Cite: seerr-team/seerr src/components/Discover/constants.ts genreColorMap */
const GENRE_COLOR_MAP: Record<number, [string, string]> = {
  0: ["1F2937", "D1D5DB"],
  28: ["991B1B", "FCA5A5"],
  12: ["480c8b", "a96bef"],
  16: ["032541", "01b4e4"],
  35: ["92400E", "FCD34D"],
  80: ["1F2937", "2864d2"],
  99: ["065F46", "6EE7B7"],
  18: ["9D174D", "F9A8D4"],
  10751: ["777e0d", "e4ed55"],
  14: ["1F2937", "60A5FA"],
  36: ["92400E", "FCD34D"],
  27: ["1F2937", "D1D5DB"],
  10402: ["032541", "01b4e4"],
  9648: ["5B21B6", "C4B5FD"],
  10749: ["9D174D", "F9A8D4"],
  878: ["1F2937", "60A5FA"],
  10770: ["991B1B", "FCA5A5"],
  53: ["1F2937", "D1D5DB"],
  10752: ["1F2937", "F87171"],
  37: ["92400E", "FCD34D"],
  10759: ["480c8b", "a96bef"],
  10762: ["032541", "01b4e4"],
  10763: ["1F2937", "D1D5DB"],
  10764: ["552c01", "d47c1d"],
  10765: ["1F2937", "60A5FA"],
  10766: ["9D174D", "F9A8D4"],
  10767: ["065F46", "6EE7B7"],
  10768: ["1F2937", "F87171"],
};

/** Cite: seerr-team/seerr src/components/Discover/StudioSlider/index.tsx */
const STUDIOS: DiscoverCompanyTile[] = [
  {
    id: 2,
    name: "Disney",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/wdrCwmRnLFJhEoH8GSfymY85KHT.png",
  },
  {
    id: 127928,
    name: "20th Century Studios",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/h0rjX5vjW5r8yEnUBStFarjcLT4.png",
  },
  {
    id: 34,
    name: "Sony Pictures",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/GagSvqWlyPdkFHMfQ3pNq6ix9P.png",
  },
  {
    id: 174,
    name: "Warner Bros. Pictures",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/ky0xOc5OrhzkZ1N6KyUxacfQsCk.png",
  },
  {
    id: 33,
    name: "Universal",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/8lvHyhjr8oUKOOy2dKXoALWKdp0.png",
  },
  {
    id: 4,
    name: "Paramount",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/fycMZt242LVjagMByZOLUGbCvv3.png",
  },
  {
    id: 3,
    name: "Pixar",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/1TjvGVDMYsj6JBxOAkUHpPEwLf7.png",
  },
  {
    id: 521,
    name: "Dreamworks",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/kP7t6RwGz2AvvTkvnI1uteEwHet.png",
  },
  {
    id: 420,
    name: "Marvel Studios",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/hUzeosd33nzE5MCNsZxCGEKTXaQ.png",
  },
  {
    id: 9993,
    name: "DC",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/2Tc1P3Ac8M479naPp1kYT3izLS5.png",
  },
  {
    id: 41077,
    name: "A24",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/1ZXsGaFPgrgS6ZZGS37AqD5uU12.png",
  },
];

/** Cite: seerr-team/seerr src/components/Discover/NetworkSlider/index.tsx */
const NETWORKS: DiscoverCompanyTile[] = [
  {
    id: 213,
    name: "Netflix",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/wwemzKWzjKYJFfCeiB57q3r4Bcm.png",
  },
  {
    id: 2739,
    name: "Disney+",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/gJ8VX6JSu3ciXHuC2dDGAo2lvwM.png",
  },
  {
    id: 1024,
    name: "Prime Video",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/ifhbNuuVnlwYy5oXA5VIb2YR8AZ.png",
  },
  {
    id: 2552,
    name: "Apple TV+",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/4KAy34EHvRM25Ih8wb82AuGU7zJ.png",
  },
  {
    id: 453,
    name: "Hulu",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/pqUTCleNUiTLAVlelGxUgWn1ELh.png",
  },
  {
    id: 49,
    name: "HBO",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/tuomPhY2UtuPTqqFnKMVHvSb724.png",
  },
  {
    id: 4353,
    name: "Discovery+",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/1D1bS3Dyw4ScYnFWTlBOvJXC3nb.png",
  },
  {
    id: 2,
    name: "ABC",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/ndAvF4JLsliGreX87jAc9GdjmJY.png",
  },
  {
    id: 19,
    name: "FOX",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/1DSpHrWyOORkL9N2QHX7Adt31mQ.png",
  },
  {
    id: 359,
    name: "Cinemax",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/6mSHSquNpfLgDdv6VnOOvC5Uz2h.png",
  },
  {
    id: 174,
    name: "AMC",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/pmvRmATOCaDykE6JrVoeYxlFHw3.png",
  },
  {
    id: 67,
    name: "Showtime",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/Allse9kbjiP6ExaQrnSpIhkurEi.png",
  },
  {
    id: 318,
    name: "Starz",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/8GJjw3HHsAJYwIWKIPBPfqMxlEa.png",
  },
  {
    id: 71,
    name: "The CW",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/ge9hzeaU7nMtQ4PjkFlc68dGAJ9.png",
  },
  {
    id: 6,
    name: "NBC",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/o3OedEP0f9mfZr33jz2BfXOUK5.png",
  },
  {
    id: 16,
    name: "CBS",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/nm8d7P7MJNiBLdgIzUK0gkuEA4r.png",
  },
  {
    id: 4330,
    name: "Paramount+",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/fi83B1oztoS47xxcemFdPMhIzK.png",
  },
  {
    id: 4,
    name: "BBC One",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/mVn7xESaTNmjBUyUtGNvDQd3CT1.png",
  },
  {
    id: 56,
    name: "Cartoon Network",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/c5OC6oVCg6QP4eqzW6XIq17CQjI.png",
  },
  {
    id: 80,
    name: "Adult Swim",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/9AKyspxVzywuaMuZ1Bvilu8sXly.png",
  },
  {
    id: 13,
    name: "Nickelodeon",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/ikZXxg6GnwpzqiZbRPhJGaZapqB.png",
  },
  {
    id: 3353,
    name: "Peacock",
    imageUrl:
      "https://image.tmdb.org/t/p/w780_filter(duotone,ffffff,bababa)/gIAcGTjKKr0KOHL5s4O36roJ8p7.png",
  },
];

const HOME_PAGE_SIZE = 20;
const FEATURED_SLIDE_COUNT = 20;
/** How many titles to pull from each trending/popular bucket before interleaving (4×5 = 20). */
const FEATURED_PER_BUCKET = 5;

/** Prefer actionable request states when merging badges across Seerr instances. */
const AVAILABILITY_RANK: Record<SeerrMediaAvailability, number> = {
  pending: 5,
  processing: 4,
  partial: 3,
  available: 2,
  unknown: 1,
  deleted: 0,
};

type SeerrMediaListItem = {
  tmdbId?: number;
  mediaType?: string;
  status?: number | string;
  status4k?: number | string;
  downloadStatus?: unknown[];
  requests?: SeerrMediaRequestRef[];
};

type SeerrMediaListPage = {
  results?: SeerrMediaListItem[];
};

type SeerrRequestListItem = {
  id?: number;
  type?: string;
  is4k?: boolean;
  status?: number;
  media?: {
    tmdbId?: number;
    mediaType?: string;
    status?: number | string;
  };
};

type SeerrRequestListPage = {
  results?: SeerrRequestListItem[];
};

type CrossSeerrStatus = {
  availability: SeerrMediaAvailability;
  requestId?: number;
  requestInstanceId: string;
};

function requireSeerr(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) throw new Error(`Instance ${instanceId} not found`);
  if (instance.kind !== "seerr") {
    throw new Error(`Instance ${instanceId} is not a Seerr client`);
  }
  return instance;
}

function seerrInstances(instances: Instance[]): Instance[] {
  return instances.filter((i) => i.kind === "seerr");
}

function statusKey(mediaType: "movie" | "tv", tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}

function preferStatus(
  a: CrossSeerrStatus | undefined,
  b: CrossSeerrStatus | undefined,
): CrossSeerrStatus | undefined {
  if (!a) return b;
  if (!b) return a;
  const ra = AVAILABILITY_RANK[a.availability] ?? 0;
  const rb = AVAILABILITY_RANK[b.availability] ?? 0;
  if (rb !== ra) return rb > ra ? b : a;
  return a.requestId != null ? a : b;
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

/** Seerr MediaStatus: 1 unknown, 2 pending, 3 processing, 4 partial, 5 available, 6 blocklisted, 7 deleted. */
function mapAvailability(value?: number | string | null): SeerrMediaAvailability | undefined {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || !Number.isFinite(n)) return undefined;
  switch (n) {
    case 1:
      return "unknown";
    case 2:
      return "pending";
    case 3:
      return "processing";
    case 4:
      return "partial";
    case 5:
      return "available";
    case 6:
      return "deleted"; // older forks used 6=deleted; blocklisted also 6 in current Seerr — treat as hidden/deleted for badges
    case 7:
      return "deleted";
    default:
      return undefined;
  }
}

/**
 * Prefer non-unknown `status`, then `status4k` (4K-only requests), then open requests /
 * active downloads — mirrors what Seerr TitleCard can show from mediaInfo.
 */
function resolveAvailability(info?: SeerrMediaInfo): SeerrMediaAvailability | undefined {
  if (!info) return undefined;

  const primary = mapAvailability(info.status);
  if (primary && primary !== "unknown") return primary;

  const fourK = mapAvailability(info.status4k);
  if (fourK && fourK !== "unknown") return fourK;

  const requests = info.requests ?? [];
  if (requests.some((r) => r.status === 1)) return "pending";
  if (requests.some((r) => r.status === 2)) return "processing";
  if (requests.length > 0) return "pending";

  if ((info.downloadStatus?.length ?? 0) > 0) return "processing";

  return primary;
}

function pickRequestId(info?: SeerrMediaInfo): number | undefined {
  const requests = info?.requests ?? [];
  const non4k = requests.find((r) => r.id != null && !r.is4k);
  const any = requests.find((r) => r.id != null);
  return non4k?.id ?? any?.id;
}

function mapCard(
  raw: SeerrDiscoverResult,
  forcedType?: "movie" | "tv",
  contentInstanceId?: string,
): DiscoverCard | null {
  const tmdbId = raw.id;
  if (tmdbId == null) return null;
  const mediaType: "movie" | "tv" =
    forcedType ??
    (raw.mediaType === "tv" || (raw.name != null && raw.title == null) ? "tv" : "movie");
  const title =
    (mediaType === "movie" ? raw.title : raw.name)?.trim() ||
    raw.title?.trim() ||
    raw.name?.trim();
  if (!title) return null;
  const requestId = pickRequestId(raw.mediaInfo);
  return {
    tmdbId,
    mediaType,
    title,
    year: yearFromDate(mediaType === "movie" ? raw.releaseDate : raw.firstAirDate),
    posterUrl: tmdbImageUrl("w342", raw.posterPath),
    availability: resolveAvailability(raw.mediaInfo),
    requestId,
    requestInstanceId: requestId != null ? contentInstanceId : undefined,
  };
}

function mapFeaturedItem(
  raw: SeerrDiscoverResult,
  forcedType: "movie" | "tv",
  contentInstanceId: string,
): DiscoverFeaturedItem | null {
  const card = mapCard(raw, forcedType, contentInstanceId);
  if (!card) return null;
  const overview = raw.overview?.trim() || undefined;
  return {
    ...card,
    overview,
    backdropUrl: tmdbImageUrl("w1280", raw.backdropPath),
  };
}

/**
 * Interleave trending + popular movie/TV into Featured (5 unique per bucket → 20).
 * Prefer titles with a backdrop; skip duplicates across buckets.
 */
function buildFeaturedSlides(
  buckets: Array<{ mediaType: "movie" | "tv"; results: SeerrDiscoverResult[] }>,
  contentInstanceId: string,
): DiscoverFeaturedItem[] {
  const seen = new Set<string>();

  const pickFromBucket = (
    bucket: { mediaType: "movie" | "tv"; results: SeerrDiscoverResult[] },
  ): DiscoverFeaturedItem[] => {
    const picked: DiscoverFeaturedItem[] = [];
    const candidates = bucket.results
      .map((raw) => mapFeaturedItem(raw, bucket.mediaType, contentInstanceId))
      .filter((item): item is DiscoverFeaturedItem => item != null);

    for (const requireBackdrop of [true, false]) {
      for (const item of candidates) {
        if (picked.length >= FEATURED_PER_BUCKET) break;
        if (requireBackdrop && !item.backdropUrl) continue;
        const key = `${item.mediaType}:${item.tmdbId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        picked.push(item);
      }
      if (picked.length >= FEATURED_PER_BUCKET) break;
    }
    return picked;
  };

  const queues = buckets.map(pickFromBucket);
  const mixed: DiscoverFeaturedItem[] = [];
  const maxLen = Math.max(0, ...queues.map((q) => q.length));
  for (let i = 0; i < maxLen && mixed.length < FEATURED_SLIDE_COUNT; i++) {
    for (const queue of queues) {
      const item = queue[i];
      if (item) mixed.push(item);
      if (mixed.length >= FEATURED_SLIDE_COUNT) break;
    }
  }
  return mixed;
}

/**
 * Pull pending/processing/partial/available media from every Seerr so Discover badges
 * reflect requests that live on a different instance than the content feed.
 */
async function softFetchMediaFilter(
  instance: Instance,
  filter: "pending" | "processing" | "partial" | "available",
): Promise<SeerrMediaListItem[]> {
  try {
    const params = new URLSearchParams({
      take: "500",
      skip: "0",
      filter,
      sort: "modified",
    });
    const page = await arrJson<SeerrMediaListPage>(instance, `/api/v1/media?${params}`, {
      timeoutMs: 20_000,
    });
    return Array.isArray(page.results) ? page.results : [];
  } catch {
    return [];
  }
}

/** Media list omits nested requests — pull open requests for requestId deep-links. */
async function softFetchOpenRequests(
  instance: Instance,
  filter: "pending" | "processing",
): Promise<SeerrRequestListItem[]> {
  try {
    const params = new URLSearchParams({
      take: "500",
      skip: "0",
      filter,
      sort: "modified",
      sortDirection: "desc",
      mediaType: "all",
    });
    const page = await arrJson<SeerrRequestListPage>(instance, `/api/v1/request?${params}`, {
      timeoutMs: 20_000,
    });
    return Array.isArray(page.results) ? page.results : [];
  } catch {
    return [];
  }
}

function upsertStatus(
  index: Map<string, CrossSeerrStatus>,
  mediaType: "movie" | "tv",
  tmdbId: number,
  entry: CrossSeerrStatus,
): void {
  const key = statusKey(mediaType, tmdbId);
  index.set(key, preferStatus(index.get(key), entry)!);
}

async function buildCrossSeerrStatusIndex(
  instances: Instance[],
): Promise<Map<string, CrossSeerrStatus>> {
  const seerrs = seerrInstances(instances);
  const index = new Map<string, CrossSeerrStatus>();
  if (seerrs.length === 0) return index;

  const cacheKey = `discover:status-index:${seerrs
    .map((i) => i.id)
    .sort()
    .join(",")}`;
  const cached = activityListCache.get<Array<[string, CrossSeerrStatus]>>(cacheKey);
  if (cached) return new Map(cached);

  const mediaFilters = ["pending", "processing", "partial", "available"] as const;
  const requestFilters = ["pending", "processing"] as const;

  const [mediaBatches, requestBatches] = await Promise.all([
    Promise.all(
      seerrs.flatMap((instance) =>
        mediaFilters.map(async (filter) => ({
          instanceId: instance.id,
          results: await softFetchMediaFilter(instance, filter),
        })),
      ),
    ),
    Promise.all(
      seerrs.flatMap((instance) =>
        requestFilters.map(async (filter) => ({
          instanceId: instance.id,
          filter,
          results: await softFetchOpenRequests(instance, filter),
        })),
      ),
    ),
  ]);

  for (const { instanceId, results } of mediaBatches) {
    for (const item of results) {
      const tmdbId = item.tmdbId;
      if (tmdbId == null) continue;
      const mediaType: "movie" | "tv" | null =
        item.mediaType === "movie" || item.mediaType === "tv" ? item.mediaType : null;
      if (!mediaType) continue;
      const availability = resolveAvailability(item);
      if (!availability || availability === "unknown" || availability === "deleted") continue;
      upsertStatus(index, mediaType, tmdbId, {
        availability,
        requestId: pickRequestId(item),
        requestInstanceId: instanceId,
      });
    }
  }

  for (const { instanceId, filter, results } of requestBatches) {
    for (const request of results) {
      if (request.id == null || request.is4k) continue;
      const tmdbId = request.media?.tmdbId;
      if (tmdbId == null) continue;
      const mediaType: "movie" | "tv" =
        request.type === "tv" || request.media?.mediaType === "tv" ? "tv" : "movie";
      const availability: SeerrMediaAvailability =
        filter === "pending" ? "pending" : "processing";
      upsertStatus(index, mediaType, tmdbId, {
        availability,
        requestId: request.id,
        requestInstanceId: instanceId,
      });
    }
  }

  activityListCache.set(cacheKey, [...index.entries()], 30_000);
  return index;
}

function applyCrossSeerrStatus<T extends DiscoverCard>(
  cards: T[],
  contentInstanceId: string,
  index: Map<string, CrossSeerrStatus>,
): T[] {
  if (index.size === 0) return cards;
  return cards.map((card) => {
    const local: CrossSeerrStatus | undefined =
      card.availability && card.availability !== "unknown" && card.availability !== "deleted"
        ? {
            availability: card.availability,
            requestId: card.requestId,
            requestInstanceId: card.requestInstanceId ?? contentInstanceId,
          }
        : undefined;
    const remote = index.get(statusKey(card.mediaType, card.tmdbId));
    const chosen = preferStatus(local, remote);
    if (!chosen) return card;
    if (
      chosen.availability === card.availability &&
      chosen.requestId === card.requestId &&
      (chosen.requestInstanceId === card.requestInstanceId ||
        (card.requestInstanceId == null && chosen.requestInstanceId === contentInstanceId))
    ) {
      return card;
    }
    return {
      ...card,
      availability: chosen.availability,
      requestId: chosen.requestId,
      requestInstanceId: chosen.requestId != null ? chosen.requestInstanceId : undefined,
    };
  });
}

async function enrichCardsWithCrossSeerrStatus(
  instances: Instance[],
  contentInstanceId: string,
  cards: DiscoverCard[],
): Promise<DiscoverCard[]> {
  if (seerrInstances(instances).length <= 1) return cards;
  const index = await buildCrossSeerrStatusIndex(instances);
  return applyCrossSeerrStatus(cards, contentInstanceId, index);
}

function genreImageUrl(genreId: number, backdrop?: string): string | undefined {
  if (!backdrop) return undefined;
  const tones = GENRE_COLOR_MAP[genreId] ?? GENRE_COLOR_MAP[0]!;
  const normalized = backdrop.startsWith("/") ? backdrop : `/${backdrop}`;
  return `https://image.tmdb.org/t/p/w1280_filter(duotone,${tones[0]},${tones[1]})${normalized}`;
}

async function fetchDiscoverPage(
  instance: Instance,
  path: string,
  params: URLSearchParams,
): Promise<SeerrDiscoverPage> {
  const qs = params.toString();
  return arrJson<SeerrDiscoverPage>(instance, `/api/v1${path}${qs ? `?${qs}` : ""}`, {
    timeoutMs: 30_000,
  });
}

type SoftResults = { ok: boolean; results: SeerrDiscoverResult[] };

async function softFetchResults(
  instance: Instance,
  path: string,
  query: Record<string, string>,
): Promise<SoftResults> {
  try {
    const params = new URLSearchParams(query);
    const page = await fetchDiscoverPage(instance, path, params);
    return { ok: true, results: page.results ?? [] };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`[discover] soft fetch failed ${instance.id} ${path}: ${detail}`);
    return { ok: false, results: [] };
  }
}

function mapCards(
  results: SeerrDiscoverResult[],
  mediaType: "movie" | "tv",
  contentInstanceId: string,
): DiscoverCard[] {
  return results
    .map((r) => mapCard(r, mediaType, contentInstanceId))
    .filter((c): c is DiscoverCard => c != null)
    .slice(0, HOME_PAGE_SIZE);
}

type SoftGenres = { ok: boolean; items: DiscoverGenreTile[] };

async function softFetchGenres(
  instance: Instance,
  mediaType: "movie" | "tv",
): Promise<SoftGenres> {
  try {
    const items = await arrJson<SeerrGenreSliderItem[]>(
      instance,
      `/api/v1/discover/genreslider/${mediaType}`,
      { timeoutMs: 20_000 },
    );
    return {
      ok: true,
      items: (Array.isArray(items) ? items : [])
        .filter((g) => g.id != null && g.name?.trim())
        .map((g) => ({
          id: g.id!,
          name: g.name!.trim(),
          imageUrl: genreImageUrl(g.id!, g.backdrops?.[0]),
        })),
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`[discover] genre slider failed ${instance.id} ${mediaType}: ${detail}`);
    return { ok: false, items: [] };
  }
}

function posterRow(key: string, title: string, items: DiscoverCard[]): DiscoverRow {
  return { key, title, kind: "posters", items };
}

const HOME_CONTENT_TTL_MS = 12 * 60 * 60 * 1000;
const HOME_CONTENT_SPARSE_TTL_MS = 15_000;

function stripCardBadges<T extends DiscoverCard>(card: T): T {
  const { availability: _availability, requestId: _requestId, requestInstanceId: _requestInstanceId, ...rest } =
    card;
  return rest as T;
}

function stripHomeBadges(home: DiscoverHomeResponse): DiscoverHomeResponse {
  return {
    ...home,
    featured: home.featured.map(stripCardBadges),
    movies: {
      ...home.movies,
      rows: home.movies.rows.map((row) =>
        row.kind === "posters" ? { ...row, items: row.items.map(stripCardBadges) } : row,
      ),
    },
    shows: {
      ...home.shows,
      rows: home.shows.rows.map((row) =>
        row.kind === "posters" ? { ...row, items: row.items.map(stripCardBadges) } : row,
      ),
    },
  };
}

function applyBadgesToHome(
  home: DiscoverHomeResponse,
  contentInstanceId: string,
  index: Map<string, CrossSeerrStatus>,
): DiscoverHomeResponse {
  return {
    ...home,
    featured: applyCrossSeerrStatus(home.featured, contentInstanceId, index),
    movies: {
      ...home.movies,
      rows: home.movies.rows.map((row) =>
        row.kind === "posters"
          ? { ...row, items: applyCrossSeerrStatus(row.items, contentInstanceId, index) }
          : row,
      ),
    },
    shows: {
      ...home.shows,
      rows: home.shows.rows.map((row) =>
        row.kind === "posters"
          ? { ...row, items: applyCrossSeerrStatus(row.items, contentInstanceId, index) }
          : row,
      ),
    },
  };
}

async function buildDiscoverHomeContent(
  instance: Instance,
  instanceId: string,
): Promise<{
  home: DiscoverHomeResponse;
  contentFailed: boolean;
  posterCount: number;
}> {
  const [
    movieTrendingFetch,
    moviePopularFetch,
    movieUpcomingFetch,
    movieGenresFetch,
    tvTrendingFetch,
    tvPopularFetch,
    tvUpcomingFetch,
    tvGenresFetch,
  ] = await Promise.all([
    softFetchResults(instance, "/discover/trending", {
      mediaType: "movie",
      timeWindow: "week",
    }),
    softFetchResults(instance, "/discover/movies", {}),
    softFetchResults(instance, "/discover/movies/upcoming", {}),
    softFetchGenres(instance, "movie"),
    softFetchResults(instance, "/discover/trending", {
      mediaType: "tv",
      timeWindow: "week",
    }),
    softFetchResults(instance, "/discover/tv", {}),
    softFetchResults(instance, "/discover/tv/upcoming", {}),
    softFetchGenres(instance, "tv"),
  ]);

  const movieTrendingRaw = movieTrendingFetch.results;
  const moviePopularRaw = moviePopularFetch.results;
  const movieUpcomingRaw = movieUpcomingFetch.results;
  const tvTrendingRaw = tvTrendingFetch.results;
  const tvPopularRaw = tvPopularFetch.results;
  const tvUpcomingRaw = tvUpcomingFetch.results;
  const movieGenres = movieGenresFetch.items;
  const tvGenres = tvGenresFetch.items;

  const contentFailed =
    !movieTrendingFetch.ok &&
    !moviePopularFetch.ok &&
    !movieUpcomingFetch.ok &&
    !tvTrendingFetch.ok &&
    !tvPopularFetch.ok &&
    !tvUpcomingFetch.ok;
  const posterCount =
    movieTrendingRaw.length +
    moviePopularRaw.length +
    movieUpcomingRaw.length +
    tvTrendingRaw.length +
    tvPopularRaw.length +
    tvUpcomingRaw.length;

  const movieTrending = mapCards(movieTrendingRaw, "movie", instanceId);
  const moviePopular = mapCards(moviePopularRaw, "movie", instanceId);
  const movieUpcoming = mapCards(movieUpcomingRaw, "movie", instanceId);
  const tvTrending = mapCards(tvTrendingRaw, "tv", instanceId);
  const tvPopular = mapCards(tvPopularRaw, "tv", instanceId);
  const tvUpcoming = mapCards(tvUpcomingRaw, "tv", instanceId);

  const featured = buildFeaturedSlides(
    [
      { mediaType: "movie", results: movieTrendingRaw },
      { mediaType: "tv", results: tvTrendingRaw },
      { mediaType: "movie", results: moviePopularRaw },
      { mediaType: "tv", results: tvPopularRaw },
    ],
    instanceId,
  );

  const home: DiscoverHomeResponse = {
    instanceId,
    featured,
    movies: {
      mediaType: "movie",
      title: "Movies",
      rows: [
        posterRow("movie-trending", "Trending", movieTrending),
        posterRow("movie-popular", "Popular", moviePopular),
        posterRow("movie-upcoming", "Upcoming", movieUpcoming),
        {
          key: "movie-genres",
          title: "Genres",
          kind: "genres",
          items: movieGenres,
        },
        {
          key: "movie-studios",
          title: "Studios",
          kind: "companies",
          companyKind: "studio",
          items: STUDIOS,
        },
      ],
    },
    shows: {
      mediaType: "tv",
      title: "Shows",
      rows: [
        posterRow("tv-trending", "Trending", tvTrending),
        posterRow("tv-popular", "Popular", tvPopular),
        posterRow("tv-upcoming", "Upcoming", tvUpcoming),
        {
          key: "tv-genres",
          title: "Genres",
          kind: "genres",
          items: tvGenres,
        },
        {
          key: "tv-networks",
          title: "Networks",
          kind: "companies",
          companyKind: "network",
          items: NETWORKS,
        },
      ],
    },
  };

  return { home, contentFailed, posterCount };
}

export async function fetchDiscoverHome(
  instances: Instance[],
  instanceId: string,
): Promise<DiscoverHomeResponse> {
  const instance = requireSeerr(instances, instanceId);
  const contentKey = `discover:home:content:v1:${instanceId}`;
  let content = activityListCache.get<DiscoverHomeResponse>(contentKey);

  if (!content) {
    const built = await buildDiscoverHomeContent(instance, instanceId);
    content = built.home;
    // Never poison the 12h content cache with a total soft-fail (Studios/Networks are hardcoded).
    if (!built.contentFailed && built.posterCount > 0) {
      activityListCache.set(contentKey, content, HOME_CONTENT_TTL_MS);
    } else if (!built.contentFailed) {
      activityListCache.set(contentKey, content, HOME_CONTENT_SPARSE_TTL_MS);
    } else {
      console.warn(
        `[discover] home soft-fail for ${instanceId}; skipping content cache (posters=${built.posterCount})`,
      );
    }
  }

  // Always refresh badge overlay (even single Seerr) — content TTL must not freeze request state.
  const statusIndex = await buildCrossSeerrStatusIndex(instances);
  return applyBadgesToHome(content, instanceId, statusIndex);
}

/** See-more grids: 50 titles per Load more. Seerr/TMDB is fixed at 20/page — we fan-out. */
const DISCOVER_LIST_PAGE_SIZE = 50;
const SEERR_DISCOVER_PAGE_SIZE = 20;

export async function fetchDiscoverList(
  instances: Instance[],
  instanceId: string,
  mediaType: "movie" | "tv",
  query: DiscoverListQuery,
): Promise<DiscoverListResponse> {
  const instance = requireSeerr(instances, instanceId);
  const page = query.page > 0 ? query.page : 1;
  const baseParams = new URLSearchParams();
  if (query.sortBy && query.sortBy !== "trending") baseParams.set("sortBy", query.sortBy);
  if (query.genre) baseParams.set("genre", query.genre);

  let path: string;
  let title: string | undefined;

  if (query.sortBy === "trending") {
    path = `/discover/trending`;
    baseParams.set("mediaType", mediaType);
    baseParams.set("timeWindow", "week");
    title = mediaType === "movie" ? "Trending Movies" : "Trending Shows";
  } else if (mediaType === "movie") {
    if (query.studio) {
      path = `/discover/movies/studio/${encodeURIComponent(query.studio)}`;
      title = STUDIOS.find((s) => String(s.id) === query.studio)?.name;
    } else if (query.upcoming) {
      path = `/discover/movies/upcoming`;
      title = "Upcoming Movies";
    } else {
      path = `/discover/movies`;
      title = query.genre ? undefined : "Popular Movies";
    }
  } else if (query.network) {
    path = `/discover/tv/network/${encodeURIComponent(query.network)}`;
    title = NETWORKS.find((n) => String(n.id) === query.network)?.name;
  } else if (query.upcoming) {
    path = `/discover/tv/upcoming`;
    title = "Upcoming Shows";
  } else {
    path = `/discover/tv`;
    title = query.genre ? undefined : "Popular Shows";
  }

  const seerrIds = seerrInstances(instances)
    .map((i) => i.id)
    .sort()
    .join(",");
  const cacheKey = `discover:list:v2:${DISCOVER_LIST_PAGE_SIZE}:${instanceId}:${mediaType}:${path}:${baseParams}:p${page}:${seerrIds}`;
  const cached = activityListCache.get<DiscoverListResponse>(cacheKey);
  if (cached) return cached;

  const startIndex = (page - 1) * DISCOVER_LIST_PAGE_SIZE;
  const firstSeerrPage = Math.floor(startIndex / SEERR_DISCOVER_PAGE_SIZE) + 1;
  const lastSeerrPage = Math.ceil((startIndex + DISCOVER_LIST_PAGE_SIZE) / SEERR_DISCOVER_PAGE_SIZE);

  const seerrPages = await Promise.all(
    Array.from({ length: lastSeerrPage - firstSeerrPage + 1 }, (_, offset) => {
      const seerrPage = firstSeerrPage + offset;
      const params = new URLSearchParams(baseParams);
      params.set("page", String(seerrPage));
      return fetchDiscoverPage(instance, path, params);
    }),
  );

  const totalResults = seerrPages[0]?.totalResults ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalResults / DISCOVER_LIST_PAGE_SIZE));
  const sliceStart = startIndex - (firstSeerrPage - 1) * SEERR_DISCOVER_PAGE_SIZE;
  const rawResults = seerrPages.flatMap((p) => p.results ?? []).slice(
    sliceStart,
    sliceStart + DISCOVER_LIST_PAGE_SIZE,
  );

  const items = await enrichCardsWithCrossSeerrStatus(
    instances,
    instanceId,
    rawResults
      .map((r) => mapCard(r, mediaType, instanceId))
      .filter((c): c is DiscoverCard => c != null),
  );

  const response: DiscoverListResponse = {
    instanceId,
    mediaType,
    page,
    totalPages,
    totalResults,
    items,
    title,
  };
  activityListCache.set(cacheKey, response, 30_000);
  return response;
}

export async function searchDiscover(
  instances: Instance[],
  instanceId: string,
  searchQuery: string,
  page = 1,
): Promise<DiscoverSearchResponse> {
  const instance = requireSeerr(instances, instanceId);
  const q = searchQuery.trim();
  if (!q) {
    return { instanceId, page: 1, totalPages: 0, totalResults: 0, items: [] };
  }

  const pageNum = page > 0 ? page : 1;
  const seerrIds = seerrInstances(instances)
    .map((i) => i.id)
    .sort()
    .join(",");
  const cacheKey = `discover:search:${instanceId}:${pageNum}:${q.toLowerCase()}:${seerrIds}`;
  const cached = activityListCache.get<DiscoverSearchResponse>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    query: q,
    page: String(pageNum),
  });
  const raw = await arrJson<SeerrDiscoverPage>(instance, `/api/v1/search?${params}`, {
    timeoutMs: 30_000,
  });

  const items = await enrichCardsWithCrossSeerrStatus(
    instances,
    instanceId,
    (raw.results ?? [])
      .filter((r) => r.mediaType === "movie" || r.mediaType === "tv")
      .map((r) => mapCard(r, undefined, instanceId))
      .filter((c): c is DiscoverCard => c != null),
  );

  const response: DiscoverSearchResponse = {
    instanceId,
    page: raw.page ?? pageNum,
    totalPages: raw.totalPages ?? 1,
    totalResults: raw.totalResults ?? items.length,
    items,
  };
  activityListCache.set(cacheKey, response, 30_000);
  return response;
}

export async function fetchDiscoverTitle(
  instances: Instance[],
  instanceId: string,
  mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<DiscoverTitleResponse> {
  const media = await getSeerrTitleDetail(instances, instanceId, mediaType, tmdbId);
  return { instanceId, media };
}
