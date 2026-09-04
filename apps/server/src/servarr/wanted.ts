import type {
  ArrKind,
  Instance,
  UnifiedWantedResponse,
  WantedListItem,
  WantedMode,
} from "@umbrellarr/shared";
import { arrJson } from "./client.js";

type ArrQuality = { quality?: { name?: string } };

type RadarrWantedMovie = {
  id: number;
  title?: string;
  year?: number;
  monitored?: boolean;
  isAvailable?: boolean;
  movieFile?: { quality?: ArrQuality };
};

type SonarrWantedEpisode = {
  id: number;
  title?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  airDateUtc?: string;
  airDate?: string;
  monitored?: boolean;
  seriesId?: number;
  series?: { id?: number; title?: string };
  episodeFile?: { quality?: ArrQuality };
};

type LidarrWantedAlbum = {
  id: number;
  title?: string;
  albumType?: string;
  releaseDate?: string;
  monitored?: boolean;
  artistId?: number;
  artist?: { id?: number; artistName?: string; name?: string };
};

type WantedPage<T> = {
  page?: number;
  pageSize?: number;
  totalRecords?: number;
  records?: T[];
};

export type WantedListQuery = {
  mode: WantedMode;
  page?: number;
  pageSize?: number;
  instanceId?: string;
  monitored?: boolean;
};

function requireArrInstance(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find(
    (i) => i.id === instanceId && (i.kind === "radarr" || i.kind === "sonarr" || i.kind === "lidarr"),
  );
  if (!instance) {
    throw new Error(`Arr instance not found: ${instanceId}`);
  }
  return instance;
}

function apiBase(kind: ArrKind): string {
  return kind === "lidarr" ? "/api/v1" : "/api/v3";
}

function wantedPath(mode: WantedMode): string {
  return mode === "missing" ? "wanted/missing" : "wanted/cutoff";
}

function qualityName(file?: { quality?: ArrQuality }): string | undefined {
  return file?.quality?.quality?.name;
}

function mapRadarrMovie(instance: Instance, movie: RadarrWantedMovie): WantedListItem {
  return {
    id: movie.id,
    instanceId: instance.id,
    kind: "radarr",
    title: movie.title ?? `Movie ${movie.id}`,
    monitored: movie.monitored ?? true,
    year: movie.year,
    isAvailable: movie.isAvailable,
    quality: qualityName(movie.movieFile),
    movieId: movie.id,
  };
}

function mapSonarrEpisode(instance: Instance, episode: SonarrWantedEpisode): WantedListItem {
  const seriesId = episode.seriesId ?? episode.series?.id;
  return {
    id: episode.id,
    instanceId: instance.id,
    kind: "sonarr",
    title: episode.series?.title ?? `Series ${seriesId ?? "?"}`,
    monitored: episode.monitored ?? true,
    quality: qualityName(episode.episodeFile),
    seriesId,
    seriesTitle: episode.series?.title,
    episodeId: episode.id,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    episodeTitle: episode.title,
    airDate: episode.airDateUtc ?? episode.airDate,
  };
}

function mapLidarrAlbum(instance: Instance, album: LidarrWantedAlbum): WantedListItem {
  const artistId = album.artistId ?? album.artist?.id;
  return {
    id: album.id,
    instanceId: instance.id,
    kind: "lidarr",
    title: album.title ?? `Album ${album.id}`,
    monitored: album.monitored ?? true,
    artistId,
    artistName: album.artist?.artistName ?? album.artist?.name,
    albumId: album.id,
    albumTitle: album.title,
    albumType: album.albumType,
    releaseDate: album.releaseDate,
  };
}

async function fetchWantedList(
  instance: Instance,
  mode: WantedMode,
  page: number,
  pageSize: number,
  monitored: boolean,
): Promise<{ items: WantedListItem[]; totalRecords: number }> {
  const kind = instance.kind as ArrKind;
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  params.set("monitored", monitored ? "true" : "false");

  if (kind === "radarr") {
    params.set("sortKey", "title");
    params.set("sortDirection", "ascending");
    const data = await arrJson<WantedPage<RadarrWantedMovie>>(
      instance,
      `${apiBase(kind)}/${wantedPath(mode)}?${params}`,
      { timeoutMs: 30_000 },
    );
    return {
      items: (data.records ?? []).map((r) => mapRadarrMovie(instance, r)),
      totalRecords: data.totalRecords ?? 0,
    };
  }

  if (kind === "sonarr") {
    params.set("sortKey", "airDateUtc");
    params.set("sortDirection", "descending");
    params.set("includeSeries", "true");
    const data = await arrJson<WantedPage<SonarrWantedEpisode>>(
      instance,
      `${apiBase(kind)}/${wantedPath(mode)}?${params}`,
      { timeoutMs: 30_000 },
    );
    return {
      items: (data.records ?? []).map((r) => mapSonarrEpisode(instance, r)),
      totalRecords: data.totalRecords ?? 0,
    };
  }

  params.set("sortKey", "releaseDate");
  params.set("sortDirection", "descending");
  params.set("includeArtist", "true");
  const data = await arrJson<WantedPage<LidarrWantedAlbum>>(
    instance,
    `${apiBase(kind)}/${wantedPath(mode)}?${params}`,
    { timeoutMs: 30_000 },
  );
  return {
    items: (data.records ?? []).map((r) => mapLidarrAlbum(instance, r)),
    totalRecords: data.totalRecords ?? 0,
  };
}

function sortWantedItems(items: WantedListItem[], mode: WantedMode): WantedListItem[] {
  return [...items].sort((a, b) => {
    if (mode === "missing") {
      const aDate = a.airDate ?? a.releaseDate ?? "";
      const bDate = b.airDate ?? b.releaseDate ?? "";
      if (aDate && bDate && aDate !== bDate) return bDate.localeCompare(aDate);
    }
    const aTitle = (a.seriesTitle ?? a.artistName ?? a.title).toLowerCase();
    const bTitle = (b.seriesTitle ?? b.artistName ?? b.title).toLowerCase();
    const cmp = aTitle.localeCompare(bTitle);
    if (cmp !== 0) return cmp;
    return a.title.localeCompare(b.title);
  });
}

export async function fetchUnifiedWanted(
  instances: Instance[],
  query: WantedListQuery,
): Promise<UnifiedWantedResponse> {
  const arrInstances = instances.filter(
    (i) => i.kind === "radarr" || i.kind === "sonarr" || i.kind === "lidarr",
  );
  const targets = query.instanceId
    ? arrInstances.filter((i) => i.id === query.instanceId)
    : arrInstances;

  if (query.instanceId && targets.length === 0) {
    throw new Error(`Arr instance not found: ${query.instanceId}`);
  }

  const page = query.page && query.page > 0 ? query.page : 1;
  const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 200) : 50;
  const mode = query.mode;
  const monitored = query.monitored !== false;

  const settled = await Promise.allSettled(
    targets.map((instance) => fetchWantedList(instance, mode, page, pageSize, monitored)),
  );

  const items: WantedListItem[] = [];
  const errors: UnifiedWantedResponse["errors"] = [];
  let totalRecords = 0;

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]!;
    const instance = targets[i]!;
    if (result.status === "fulfilled") {
      items.push(...result.value.items);
      totalRecords += result.value.totalRecords;
    } else {
      const message =
        result.reason instanceof Error ? result.reason.message : "Wanted fetch failed";
      errors.push({
        instanceId: instance.id,
        instanceName: instance.name,
        message,
      });
    }
  }

  return {
    items: sortWantedItems(items, mode),
    page,
    pageSize,
    totalRecords,
    mode,
    errors,
  };
}

export async function getUnifiedMissingCount(instances: Instance[]): Promise<number> {
  const result = await fetchUnifiedWanted(instances, {
    mode: "missing",
    page: 1,
    pageSize: 1,
  });
  return result.totalRecords;
}

function searchCommandName(kind: ArrKind, mode: WantedMode, hasIds: boolean): string {
  if (kind === "radarr") {
    if (hasIds) return "MoviesSearch";
    return mode === "missing" ? "MissingMoviesSearch" : "CutoffUnmetMoviesSearch";
  }
  if (kind === "sonarr") {
    if (hasIds) return "EpisodeSearch";
    return mode === "missing" ? "MissingEpisodeSearch" : "CutoffUnmetEpisodeSearch";
  }
  if (hasIds) return "AlbumSearch";
  return mode === "missing" ? "MissingAlbumSearch" : "CutoffUnmetAlbumSearch";
}

function searchBody(kind: ArrKind, name: string, ids?: number[]): Record<string, unknown> {
  if (!ids || ids.length === 0) return { name };
  if (kind === "radarr") return { name, movieIds: ids };
  if (kind === "sonarr") return { name, episodeIds: ids };
  return { name, albumIds: ids };
}

export async function searchWanted(
  instances: Instance[],
  instanceId: string,
  mode: WantedMode,
  ids?: number[],
): Promise<void> {
  const instance = requireArrInstance(instances, instanceId);
  const kind = instance.kind as ArrKind;
  const hasIds = Boolean(ids && ids.length > 0);
  const name = searchCommandName(kind, mode, hasIds);
  await arrJson(instance, `${apiBase(kind)}/command`, {
    method: "POST",
    body: searchBody(kind, name, ids),
  });
}

export async function searchWantedAll(
  instances: Instance[],
  mode: WantedMode,
  instanceId?: string,
): Promise<{ errors: UnifiedWantedResponse["errors"] }> {
  const arrInstances = instances.filter(
    (i) => i.kind === "radarr" || i.kind === "sonarr" || i.kind === "lidarr",
  );
  const targets = instanceId ? arrInstances.filter((i) => i.id === instanceId) : arrInstances;
  if (instanceId && targets.length === 0) {
    throw new Error(`Arr instance not found: ${instanceId}`);
  }

  const settled = await Promise.allSettled(
    targets.map((instance) => searchWanted(instances, instance.id, mode)),
  );
  const errors: UnifiedWantedResponse["errors"] = [];
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]!;
    const instance = targets[i]!;
    if (result.status === "rejected") {
      errors.push({
        instanceId: instance.id,
        instanceName: instance.name,
        message: result.reason instanceof Error ? result.reason.message : "Search failed",
      });
    }
  }
  return { errors };
}

export async function setWantedItemsMonitored(
  instances: Instance[],
  groups: Array<{ instanceId: string; kind: ArrKind; ids: number[] }>,
  monitored: boolean,
): Promise<void> {
  for (const group of groups) {
    const instance = requireArrInstance(instances, group.instanceId);
    const kind = instance.kind as ArrKind;
    if (kind !== group.kind) {
      throw new Error(`Instance kind mismatch for ${group.instanceId}`);
    }
    if (kind === "radarr") {
      await arrJson(instance, "/api/v3/movie/editor", {
        method: "PUT",
        body: { movieIds: group.ids, monitored },
      });
    } else if (kind === "sonarr") {
      await arrJson(instance, "/api/v3/episode/monitor", {
        method: "PUT",
        body: { episodeIds: group.ids, monitored },
      });
    } else {
      await arrJson(instance, "/api/v1/album/monitor", {
        method: "PUT",
        body: { albumIds: group.ids, monitored },
      });
    }
  }
}

export async function unmonitorWantedItems(
  instances: Instance[],
  groups: Array<{ instanceId: string; kind: ArrKind; ids: number[] }>,
): Promise<void> {
  await setWantedItemsMonitored(instances, groups, false);
}

export async function monitorWantedItems(
  instances: Instance[],
  groups: Array<{ instanceId: string; kind: ArrKind; ids: number[] }>,
): Promise<void> {
  await setWantedItemsMonitored(instances, groups, true);
}
