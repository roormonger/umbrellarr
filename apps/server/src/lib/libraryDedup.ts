import type { ArtistListItem, MovieListItem, SeriesListItem } from "@umbrellarr/shared";

function countUnique<T>(
  items: T[],
  keyFor: (item: T) => string | undefined,
  fallbackKey: (item: T) => string,
): number {
  const keys = new Set<string>();
  for (const item of items) {
    keys.add(keyFor(item) ?? fallbackKey(item));
  }
  return keys.size;
}

export function countUniqueMovies(movies: MovieListItem[]): number {
  return countUnique(
    movies,
    (movie) => (movie.tmdbId != null ? `tmdb:${movie.tmdbId}` : undefined),
    (movie) => `${movie.instanceId}:${movie.externalId}`,
  );
}

export function countUniqueShows(series: SeriesListItem[]): number {
  return countUnique(
    series,
    (show) => {
      if (show.tvdbId != null) return `tvdb:${show.tvdbId}`;
      if (show.tmdbId != null) return `tmdb:${show.tmdbId}`;
      return undefined;
    },
    (show) => `${show.instanceId}:${show.externalId}`,
  );
}

export function countUniqueArtists(artists: ArtistListItem[]): number {
  return countUnique(
    artists,
    (artist) => (artist.foreignArtistId ? `mbid:${artist.foreignArtistId}` : undefined),
    (artist) => `${artist.instanceId}:${artist.externalId}`,
  );
}
