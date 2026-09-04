import type { Instance, MovieListItem } from "@umbrellarr/shared";
import { arrJson } from "./client.js";
import { toGridPosterPath } from "./mediaCover.js";
import { moviePosterStatus } from "./posterStatus.js";
import { fetchQueueEntityIds } from "./queueIds.js";

type RadarrImage = {
  coverType?: string;
  url?: string;
  remoteUrl?: string;
};

type RadarrRating = {
  value?: number;
  votes?: number;
};

type RadarrMovie = {
  id: number;
  title: string;
  sortTitle?: string;
  originalTitle?: string;
  year?: number;
  overview?: string;
  monitored: boolean;
  hasFile: boolean;
  isAvailable?: boolean;
  status?: string;
  tmdbId?: number;
  studio?: string;
  qualityProfileId?: number;
  added?: string;
  inCinemas?: string;
  digitalRelease?: string;
  physicalRelease?: string;
  popularity?: number;
  path?: string;
  sizeOnDisk?: number;
  certification?: string;
  tags?: number[];
  originalLanguage?: { id?: number; name?: string };
  ratings?: {
    imdb?: RadarrRating;
    tmdb?: RadarrRating;
    rottenTomatoes?: RadarrRating;
    trakt?: RadarrRating;
  };
  images?: RadarrImage[];
};

type QualityProfile = {
  id: number;
  name: string;
};

type ArrTag = {
  id: number;
  label: string;
};

type WantedPage = {
  records?: Array<{ id: number }>;
  totalRecords?: number;
  page?: number;
  pageSize?: number;
};

function posterUrlFor(instance: Instance, movie: RadarrMovie): string | undefined {
  const poster = movie.images?.find((img) => img.coverType === "poster");
  if (!poster) return undefined;

  if (poster.url?.startsWith("/")) {
    const path = toGridPosterPath(poster.url.split("?")[0] ?? poster.url);
    return `/api/media/${encodeURIComponent(instance.id)}/image?path=${encodeURIComponent(path)}`;
  }

  return poster.remoteUrl;
}


async function fetchCutoffUnmetIds(instance: Instance): Promise<Set<number>> {
  const ids = new Set<number>();
  let page = 1;
  const pageSize = 500;

  for (;;) {
    const data = await arrJson<WantedPage>(
      instance,
      `/api/v3/wanted/cutoff?page=${page}&pageSize=${pageSize}&monitored=true`,
    );
    for (const record of data.records ?? []) {
      ids.add(record.id);
    }
    const total = data.totalRecords ?? ids.size;
    if (ids.size >= total || (data.records?.length ?? 0) === 0) break;
    page += 1;
    if (page > 50) break;
  }

  return ids;
}

export function mapRadarrMovie(
  instance: Instance,
  movie: RadarrMovie,
  profiles: Map<number, string>,
  tags: Map<number, string>,
  cutoffIds: Set<number>,
  queuedIds: Set<number> = new Set(),
): MovieListItem {
  return {
    kind: "movie",
    instanceId: instance.id,
    externalId: movie.id,
    title: movie.title,
    sortTitle: movie.sortTitle ?? movie.title,
    year: movie.year,
    posterUrl: posterUrlFor(instance, movie),
    monitored: movie.monitored,
    hasFile: movie.hasFile,
    isAvailable: movie.isAvailable,
    availability: moviePosterStatus({
      hasFile: movie.hasFile,
      monitored: movie.monitored,
      isAvailable: Boolean(movie.isAvailable),
      status: movie.status,
      downloading: queuedIds.has(movie.id),
    }),
    tmdbId: movie.tmdbId,
    studio: movie.studio,
    qualityProfileName:
      movie.qualityProfileId != null ? profiles.get(movie.qualityProfileId) : undefined,
    added: movie.added,
    inCinemas: movie.inCinemas,
    digitalRelease: movie.digitalRelease,
    physicalRelease: movie.physicalRelease,
    tmdbRating: movie.ratings?.tmdb?.value,
    imdbRating: movie.ratings?.imdb?.value,
    tomatoRating: movie.ratings?.rottenTomatoes?.value,
    traktRating: movie.ratings?.trakt?.value,
    popularity: movie.popularity,
    path: movie.path,
    sizeOnDisk: movie.sizeOnDisk,
    certification: movie.certification,
    originalTitle: movie.originalTitle,
    originalLanguage: movie.originalLanguage?.name,
    tags: (movie.tags ?? []).map((id) => tags.get(id) ?? String(id)),
    cutoffUnmet: cutoffIds.has(movie.id),
  };
}

export async function fetchMoviesForInstance(instance: Instance): Promise<MovieListItem[]> {
  const [movies, profiles, tagList, cutoffIds, queuedIds] = await Promise.all([
    arrJson<RadarrMovie[]>(instance, "/api/v3/movie", { timeoutMs: 90_000 }),
    arrJson<QualityProfile[]>(instance, "/api/v3/qualityprofile"),
    arrJson<ArrTag[]>(instance, "/api/v3/tag"),
    fetchCutoffUnmetIds(instance).catch((error) => {
      console.warn(`[movies] cutoff lookup failed for ${instance.id}`, error);
      return new Set<number>();
    }),
    fetchQueueEntityIds(instance, "movieId"),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.id, p.name]));
  const tagMap = new Map(tagList.map((t) => [t.id, t.label]));

  return movies.map((movie) =>
    mapRadarrMovie(instance, movie, profileMap, tagMap, cutoffIds, queuedIds),
  );
}

export async function fetchAllMovies(instances: Instance[]): Promise<MovieListItem[]> {
  const radarr = instances.filter((i) => i.kind === "radarr");
  const results = await Promise.allSettled(radarr.map((i) => fetchMoviesForInstance(i)));

  const movies: MovieListItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      movies.push(...result.value);
    } else {
      console.warn("[movies]", result.reason);
    }
  }

  movies.sort((a, b) =>
    (a.sortTitle ?? a.title).localeCompare(b.sortTitle ?? b.title, undefined, {
      sensitivity: "base",
    }),
  );
  return movies;
}
