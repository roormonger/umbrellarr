import type {
  MovieFilterKey,
  MovieListItem,
  MovieSortDirection,
  MovieSortKey,
} from "@umbrellarr/shared";

const STATUS_ORDER: Record<MovieListItem["availability"], number> = {
  queued: 0,
  downloading: 1,
  missingMonitored: 2,
  missingUnmonitored: 3,
  unreleased: 4,
  continuing: 5,
  ended: 6,
  downloaded: 7,
  downloadedUnmonitored: 8,
};

function releaseDateValue(movie: MovieListItem): number {
  const raw = movie.digitalRelease ?? movie.physicalRelease ?? movie.inCinemas;
  return raw ? Date.parse(raw) : Number.NaN;
}

function sortValue(movie: MovieListItem, key: MovieSortKey): string | number {
  switch (key) {
    case "monitoredStatus":
      return STATUS_ORDER[movie.availability] * 10 + (movie.monitored ? 0 : 1);
    case "title":
      return (movie.sortTitle ?? movie.title).toLocaleLowerCase();
    case "studio":
      return (movie.studio ?? "").toLocaleLowerCase();
    case "qualityProfile":
      return (movie.qualityProfileName ?? "").toLocaleLowerCase();
    case "added":
      return movie.added ? Date.parse(movie.added) : Number.NaN;
    case "year":
      return movie.year ?? Number.NaN;
    case "inCinemas":
      return movie.inCinemas ? Date.parse(movie.inCinemas) : Number.NaN;
    case "digitalRelease":
      return movie.digitalRelease ? Date.parse(movie.digitalRelease) : Number.NaN;
    case "physicalRelease":
      return movie.physicalRelease ? Date.parse(movie.physicalRelease) : Number.NaN;
    case "releaseDate":
      return releaseDateValue(movie);
    case "tmdbRating":
      return movie.tmdbRating ?? Number.NaN;
    case "imdbRating":
      return movie.imdbRating ?? Number.NaN;
    case "tomatoRating":
      return movie.tomatoRating ?? Number.NaN;
    case "traktRating":
      return movie.traktRating ?? Number.NaN;
    case "popularity":
      return movie.popularity ?? Number.NaN;
    case "path":
      return (movie.path ?? "").toLocaleLowerCase();
    case "sizeOnDisk":
      return movie.sizeOnDisk ?? Number.NaN;
    case "certification":
      return (movie.certification ?? "").toLocaleLowerCase();
    case "originalTitle":
      return (movie.originalTitle ?? movie.title).toLocaleLowerCase();
    case "originalLanguage":
      return (movie.originalLanguage ?? "").toLocaleLowerCase();
    case "tags":
      return movie.tags.join(", ").toLocaleLowerCase();
  }
}

function compareValues(a: string | number, b: string | number): number {
  const aEmpty =
    a === "" || (typeof a === "number" && Number.isNaN(a));
  const bEmpty =
    b === "" || (typeof b === "number" && Number.isNaN(b));
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  }
  return (a as number) - (b as number);
}

export function filterMovies(
  movies: MovieListItem[],
  filter: MovieFilterKey,
): MovieListItem[] {
  switch (filter) {
    case "all":
      return movies;
    case "monitored":
      return movies.filter((m) => m.monitored);
    case "unmonitored":
      return movies.filter((m) => !m.monitored);
    case "missing":
      return movies.filter((m) => m.monitored && !m.hasFile);
    case "wanted":
      return movies.filter((m) => m.monitored && !m.hasFile && Boolean(m.isAvailable));
    case "cutoffUnmet":
      return movies.filter((m) => m.cutoffUnmet);
  }
}

export function sortMovies(
  movies: MovieListItem[],
  key: MovieSortKey,
  direction: MovieSortDirection,
): MovieListItem[] {
  const dir = direction === "asc" ? 1 : -1;
  return [...movies].sort((left, right) => {
    const primary = compareValues(sortValue(left, key), sortValue(right, key));
    if (primary !== 0) return primary * dir;
    return (left.sortTitle ?? left.title).localeCompare(right.sortTitle ?? right.title, undefined, {
      sensitivity: "base",
    });
  });
}

export function applyMovieQuery(
  movies: MovieListItem[],
  query: string,
): MovieListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return movies;
  return movies.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.originalTitle?.toLowerCase().includes(q) ||
      m.studio?.toLowerCase().includes(q) ||
      (m.year != null && String(m.year).includes(q)),
  );
}
