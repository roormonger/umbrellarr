import type { Availability, Instance, SeriesListItem } from "@umbrellarr/shared";
import { arrJson } from "./client.js";
import { toGridPosterPath } from "./mediaCover.js";

type SonarrImage = {
  coverType?: string;
  url?: string;
  remoteUrl?: string;
};

type SonarrRating = {
  value?: number;
  votes?: number;
};

type SonarrStatistics = {
  seasonCount?: number;
  episodeCount?: number;
  episodeFileCount?: number;
  sizeOnDisk?: number;
  percentOfEpisodes?: number;
};

type SonarrSeries = {
  id: number;
  title: string;
  sortTitle?: string;
  year?: number;
  overview?: string;
  monitored: boolean;
  status?: string;
  network?: string;
  qualityProfileId?: number;
  added?: string;
  path?: string;
  certification?: string;
  tags?: number[];
  tvdbId?: number;
  tvMazeId?: number;
  tmdbId?: number;
  imdbId?: string;
  nextAiring?: string;
  previousAiring?: string;
  originalLanguage?: { id?: number; name?: string };
  ratings?: {
    imdb?: SonarrRating;
    tmdb?: SonarrRating;
    trakt?: SonarrRating;
  };
  statistics?: SonarrStatistics;
  images?: SonarrImage[];
  seasons?: Array<{ seasonNumber?: number; monitored?: boolean }>;
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
  records?: Array<{ id?: number; seriesId?: number }>;
  totalRecords?: number;
  page?: number;
  pageSize?: number;
};

function posterUrlFor(instance: Instance, series: SonarrSeries): string | undefined {
  const poster = series.images?.find((img) => img.coverType === "poster");
  if (!poster) return undefined;

  if (poster.url?.startsWith("/")) {
    const path = toGridPosterPath(poster.url.split("?")[0] ?? poster.url);
    return `/api/media/${encodeURIComponent(instance.id)}/image?path=${encodeURIComponent(path)}`;
  }

  return poster.remoteUrl;
}

export function availabilityFor(series: {
  monitored: boolean;
  status?: string;
  statistics?: SonarrStatistics;
}): Availability {
  if (!series.monitored) return "unmonitored";
  const episodeCount = series.statistics?.episodeCount ?? 0;
  const episodeFileCount = series.statistics?.episodeFileCount ?? 0;
  if (episodeCount > 0 && episodeFileCount >= episodeCount) return "downloaded";
  if (episodeCount > 0 && episodeFileCount < episodeCount) return "missing";
  // Ended / no episodes yet, or continuing with nothing aired
  if (series.status === "ended" || series.status === "deleted") return "unavailable";
  return episodeFileCount > 0 ? "downloaded" : "unavailable";
}

/** Sonarr wanted/cutoff returns episodes; collect distinct series ids. */
async function fetchCutoffUnmetSeriesIds(instance: Instance): Promise<Set<number>> {
  const ids = new Set<number>();
  let page = 1;
  const pageSize = 500;

  for (;;) {
    const data = await arrJson<WantedPage>(
      instance,
      `/api/v3/wanted/cutoff?page=${page}&pageSize=${pageSize}&monitored=true`,
    );
    for (const record of data.records ?? []) {
      if (record.seriesId != null) ids.add(record.seriesId);
    }
    const total = data.totalRecords ?? 0;
    const seen = (page - 1) * pageSize + (data.records?.length ?? 0);
    if (seen >= total || (data.records?.length ?? 0) === 0) break;
    page += 1;
    if (page > 50) break;
  }

  return ids;
}

export function mapSonarrSeries(
  instance: Instance,
  series: SonarrSeries,
  profiles: Map<number, string>,
  tags: Map<number, string>,
  cutoffIds: Set<number>,
): SeriesListItem {
  const stats = series.statistics;
  return {
    kind: "series",
    instanceId: instance.id,
    externalId: series.id,
    title: series.title,
    sortTitle: series.sortTitle ?? series.title,
    year: series.year,
    posterUrl: posterUrlFor(instance, series),
    monitored: series.monitored,
    inLibrary: true,
    hasFile: (stats?.episodeFileCount ?? 0) > 0,
    availability: availabilityFor(series),
    tmdbId: series.tmdbId,
    tvdbId: series.tvdbId,
    tvMazeId: series.tvMazeId,
    imdbId: series.imdbId,
    episodeCount: stats?.episodeCount,
    episodeFileCount: stats?.episodeFileCount,
    network: series.network,
    qualityProfileId: series.qualityProfileId,
    qualityProfileName:
      series.qualityProfileId != null ? profiles.get(series.qualityProfileId) : undefined,
    added: series.added,
    nextAiring: series.nextAiring,
    previousAiring: series.previousAiring,
    tmdbRating: series.ratings?.tmdb?.value,
    imdbRating: series.ratings?.imdb?.value,
    traktRating: series.ratings?.trakt?.value,
    path: series.path,
    sizeOnDisk: stats?.sizeOnDisk,
    certification: series.certification,
    originalLanguage: series.originalLanguage?.name,
    seasonCount: stats?.seasonCount ?? series.seasons?.filter((s) => (s.seasonNumber ?? 0) > 0).length,
    tags: (series.tags ?? []).map((id) => tags.get(id) ?? String(id)),
    cutoffUnmet: cutoffIds.has(series.id),
  };
}

export async function fetchSeriesForInstance(instance: Instance): Promise<SeriesListItem[]> {
  const [seriesList, profiles, tagList, cutoffIds] = await Promise.all([
    arrJson<SonarrSeries[]>(instance, "/api/v3/series", { timeoutMs: 90_000 }),
    arrJson<QualityProfile[]>(instance, "/api/v3/qualityprofile"),
    arrJson<ArrTag[]>(instance, "/api/v3/tag"),
    fetchCutoffUnmetSeriesIds(instance).catch((error) => {
      console.warn(`[shows] cutoff lookup failed for ${instance.id}`, error);
      return new Set<number>();
    }),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.id, p.name]));
  const tagMap = new Map(tagList.map((t) => [t.id, t.label]));

  return seriesList.map((series) =>
    mapSonarrSeries(instance, series, profileMap, tagMap, cutoffIds),
  );
}

export async function fetchAllSeries(instances: Instance[]): Promise<SeriesListItem[]> {
  const sonarr = instances.filter((i) => i.kind === "sonarr");
  const results = await Promise.allSettled(sonarr.map((i) => fetchSeriesForInstance(i)));

  const series: SeriesListItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      series.push(...result.value);
    } else {
      console.warn("[shows]", result.reason);
    }
  }

  series.sort((a, b) =>
    (a.sortTitle ?? a.title).localeCompare(b.sortTitle ?? b.title, undefined, {
      sensitivity: "base",
    }),
  );
  return series;
}
