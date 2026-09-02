import type {
  CollectionBulkUpdateRequest,
  CollectionEditOptions,
  CollectionListItem,
  CollectionMovieItem,
  Instance,
  MovieMinimumAvailability,
} from "@umbrellarr/shared";
import { MovieMinimumAvailabilitySchema } from "@umbrellarr/shared";
import { fetchMovieEditOptions } from "./movieActions.js";
import { arrJson } from "./client.js";
import { toGridPosterPath } from "./mediaCover.js";

type ArrImage = {
  coverType?: string;
  url?: string;
  remoteUrl?: string;
};

type ArrCollectionMovie = {
  tmdbId?: number;
  title?: string;
  year?: number;
  images?: ArrImage[];
  genres?: string[];
  isExisting?: boolean;
  isExcluded?: boolean;
};

type ArrCollection = {
  id: number;
  title: string;
  sortTitle?: string;
  tmdbId?: number;
  overview?: string;
  monitored?: boolean;
  missingMovies?: number;
  qualityProfileId?: number;
  rootFolderPath?: string;
  searchOnAdd?: boolean;
  minimumAvailability?: string;
  movies?: ArrCollectionMovie[];
};

type QualityProfile = {
  id: number;
  name: string;
};

function requireRadarr(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId && i.kind === "radarr");
  if (!instance) {
    throw new Error(`Radarr instance not found: ${instanceId}`);
  }
  return instance;
}

function parseMinimumAvailability(value: string | undefined): MovieMinimumAvailability {
  const parsed = MovieMinimumAvailabilitySchema.safeParse(value);
  return parsed.success ? parsed.data : "announced";
}

function uniqueGenres(movies: ArrCollectionMovie[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const movie of movies) {
    for (const genre of movie.genres ?? []) {
      const name = genre.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

function posterUrlFor(
  instance: Instance,
  movie: ArrCollectionMovie,
  movieId?: number,
): string | undefined {
  const poster = movie.images?.find((img) => img.coverType === "poster");
  if (poster?.url?.startsWith("/")) {
    const path = toGridPosterPath(poster.url.split("?")[0] ?? poster.url);
    return `/api/media/${encodeURIComponent(instance.id)}/image?path=${encodeURIComponent(path)}`;
  }
  if (movieId != null) {
    return `/api/media/${encodeURIComponent(instance.id)}/image?path=${encodeURIComponent(`/MediaCover/${movieId}/poster-500.jpg`)}`;
  }
  return poster?.remoteUrl;
}

function mapCollectionMovie(
  instance: Instance,
  movie: ArrCollectionMovie,
  tmdbToMovieId: Map<number, number>,
): CollectionMovieItem | null {
  if (movie.tmdbId == null) return null;
  const isExisting = Boolean(movie.isExisting);
  const movieId = isExisting ? tmdbToMovieId.get(movie.tmdbId) : undefined;
  return {
    tmdbId: movie.tmdbId,
    title: movie.title?.trim() || `TMDB ${movie.tmdbId}`,
    year: movie.year,
    posterUrl: posterUrlFor(instance, movie, movieId),
    isExisting,
    isExcluded: Boolean(movie.isExcluded),
    ...(movieId != null ? { movieId } : {}),
  };
}

function mapCollection(
  instance: Instance,
  collection: ArrCollection,
  profiles: Map<number, string>,
  tmdbToMovieId: Map<number, number>,
): CollectionListItem {
  const movies = (collection.movies ?? [])
    .map((movie) => mapCollectionMovie(instance, movie, tmdbToMovieId))
    .filter((movie): movie is CollectionMovieItem => movie != null);

  const missingMovies =
    typeof collection.missingMovies === "number"
      ? collection.missingMovies
      : movies.filter((m) => !m.isExisting && !m.isExcluded).length;

  const qualityProfileId =
    collection.qualityProfileId != null && collection.qualityProfileId > 0
      ? collection.qualityProfileId
      : undefined;
  const rootFolderPath = collection.rootFolderPath?.trim() || undefined;

  return {
    instanceId: instance.id,
    externalId: collection.id,
    title: collection.title,
    sortTitle: collection.sortTitle ?? collection.title,
    tmdbId: collection.tmdbId,
    overview: collection.overview?.trim() || undefined,
    monitored: Boolean(collection.monitored),
    missingMovies,
    movieCount: movies.length,
    qualityProfileId,
    qualityProfileName: qualityProfileId != null ? profiles.get(qualityProfileId) : undefined,
    rootFolderPath,
    searchOnAdd: Boolean(collection.searchOnAdd),
    minimumAvailability: parseMinimumAvailability(collection.minimumAvailability),
    genres: uniqueGenres(collection.movies ?? []),
    movies,
  };
}

export async function fetchCollections(
  instances: Instance[],
  instanceId: string,
  tmdbToMovieId: Map<number, number>,
): Promise<CollectionListItem[]> {
  const instance = requireRadarr(instances, instanceId);
  const [collections, profiles] = await Promise.all([
    arrJson<ArrCollection[]>(instance, "/api/v3/collection", { timeoutMs: 30_000 }),
    arrJson<QualityProfile[]>(instance, "/api/v3/qualityprofile").catch(
      () => [] as QualityProfile[],
    ),
  ]);
  const profileMap = new Map(profiles.map((p) => [p.id, p.name]));
  return collections
    .map((collection) => mapCollection(instance, collection, profileMap, tmdbToMovieId))
    .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle, undefined, { sensitivity: "base" }));
}

export async function bulkUpdateCollections(
  instances: Instance[],
  instanceId: string,
  request: CollectionBulkUpdateRequest,
): Promise<void> {
  const instance = requireRadarr(instances, instanceId);
  const body: Record<string, unknown> = { collectionIds: request.collectionIds };
  if (request.monitored != null) body.monitored = request.monitored;
  if (request.monitorMovies != null) body.monitorMovies = request.monitorMovies;
  if (request.searchOnAdd != null) body.searchOnAdd = request.searchOnAdd;
  if (request.qualityProfileId != null) body.qualityProfileId = request.qualityProfileId;
  if (request.rootFolderPath != null && request.rootFolderPath.length > 0) {
    body.rootFolderPath = request.rootFolderPath;
  }
  if (request.minimumAvailability != null) {
    body.minimumAvailability = request.minimumAvailability;
  }
  await arrJson(instance, "/api/v3/collection", { method: "PUT", body, timeoutMs: 30_000 });
}

export async function refreshCollections(
  instances: Instance[],
  instanceId: string,
): Promise<void> {
  const instance = requireRadarr(instances, instanceId);
  await arrJson(instance, "/api/v3/command", {
    method: "POST",
    body: { name: "RefreshCollections" },
    timeoutMs: 60_000,
  });
}

export async function fetchCollectionEditOptions(
  instances: Instance[],
  instanceId: string,
): Promise<CollectionEditOptions> {
  const options = await fetchMovieEditOptions(instances, instanceId);
  return {
    qualityProfiles: options.qualityProfiles,
    rootFolders: options.rootFolders,
  };
}
