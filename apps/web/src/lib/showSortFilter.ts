import type {
  SeriesFilterKey,
  SeriesListItem,
  SeriesSortDirection,
  SeriesSortKey,
} from "@umbrellarr/shared";

const STATUS_ORDER: Record<SeriesListItem["availability"], number> = {
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

function episodeProgress(series: SeriesListItem): number {
  const total = series.episodeCount ?? 0;
  if (total <= 0) return Number.NaN;
  return (series.episodeFileCount ?? 0) / total;
}

function sortValue(series: SeriesListItem, key: SeriesSortKey): string | number {
  switch (key) {
    case "monitoredStatus":
      return STATUS_ORDER[series.availability] * 10 + (series.monitored ? 0 : 1);
    case "title":
      return (series.sortTitle ?? series.title).toLocaleLowerCase();
    case "network":
      return (series.network ?? "").toLocaleLowerCase();
    case "qualityProfile":
      return (series.qualityProfileName ?? "").toLocaleLowerCase();
    case "added":
      return series.added ? Date.parse(series.added) : Number.NaN;
    case "year":
      return series.year ?? Number.NaN;
    case "nextAiring":
      return series.nextAiring ? Date.parse(series.nextAiring) : Number.NaN;
    case "previousAiring":
      return series.previousAiring ? Date.parse(series.previousAiring) : Number.NaN;
    case "tmdbRating":
      return series.tmdbRating ?? Number.NaN;
    case "imdbRating":
      return series.imdbRating ?? Number.NaN;
    case "traktRating":
      return series.traktRating ?? Number.NaN;
    case "path":
      return (series.path ?? "").toLocaleLowerCase();
    case "sizeOnDisk":
      return series.sizeOnDisk ?? Number.NaN;
    case "certification":
      return (series.certification ?? "").toLocaleLowerCase();
    case "originalLanguage":
      return (series.originalLanguage ?? "").toLocaleLowerCase();
    case "episodeProgress":
      return episodeProgress(series);
    case "seasonCount":
      return series.seasonCount ?? Number.NaN;
    case "tags":
      return series.tags.join(", ").toLocaleLowerCase();
  }
}

function compareValues(a: string | number, b: string | number): number {
  const aEmpty = a === "" || (typeof a === "number" && Number.isNaN(a));
  const bEmpty = b === "" || (typeof b === "number" && Number.isNaN(b));
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  }
  return (a as number) - (b as number);
}

export function filterSeries(
  series: SeriesListItem[],
  filter: SeriesFilterKey,
): SeriesListItem[] {
  switch (filter) {
    case "all":
      return series;
    case "monitored":
      return series.filter((s) => s.monitored);
    case "unmonitored":
      return series.filter((s) => !s.monitored);
    case "missing":
      return series.filter(
        (s) =>
          s.monitored &&
          (s.episodeCount ?? 0) > 0 &&
          (s.episodeFileCount ?? 0) < (s.episodeCount ?? 0),
      );
    case "wanted":
      return series.filter(
        (s) =>
          s.monitored &&
          (s.episodeCount ?? 0) > 0 &&
          (s.episodeFileCount ?? 0) < (s.episodeCount ?? 0),
      );
    case "cutoffUnmet":
      return series.filter((s) => s.cutoffUnmet);
  }
}

export function sortSeries(
  series: SeriesListItem[],
  key: SeriesSortKey,
  direction: SeriesSortDirection,
): SeriesListItem[] {
  const dir = direction === "asc" ? 1 : -1;
  return [...series].sort((left, right) => {
    const primary = compareValues(sortValue(left, key), sortValue(right, key));
    if (primary !== 0) return primary * dir;
    return (left.sortTitle ?? left.title).localeCompare(right.sortTitle ?? right.title, undefined, {
      sensitivity: "base",
    });
  });
}

export function applySeriesQuery(series: SeriesListItem[], query: string): SeriesListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return series;
  return series.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.network?.toLowerCase().includes(q) ||
      (s.year != null && String(s.year).includes(q)),
  );
}
