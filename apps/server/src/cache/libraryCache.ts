import type {
  ArtistListItem,
  CacheStatus,
  Instance,
  MovieListItem,
  SeriesListItem,
} from "@umbrellarr/shared";
import {
  countUniqueArtists,
  countUniqueMovies,
  countUniqueShows,
} from "../lib/libraryDedup.js";
import { fetchArtistsForInstance } from "../servarr/artists.js";
import { fetchMoviesForInstance } from "../servarr/movies.js";
import { fetchSeriesForInstance } from "../servarr/shows.js";

export type InstanceMovieSnapshot = {
  instanceId: string;
  fetchedAt: number;
  movies: MovieListItem[];
};

export type InstanceSeriesSnapshot = {
  instanceId: string;
  fetchedAt: number;
  series: SeriesListItem[];
};

export type InstanceArtistSnapshot = {
  instanceId: string;
  fetchedAt: number;
  artists: ArtistListItem[];
};

type HeadSnapshot<T> = {
  items: T[];
  total: number;
  fetchedAt: number;
};

export type LibraryCacheDeps = {
  fetchMovies?: (instance: Instance) => Promise<MovieListItem[]>;
  fetchSeries?: (instance: Instance) => Promise<SeriesListItem[]>;
  fetchArtists?: (instance: Instance) => Promise<ArtistListItem[]>;
  now?: () => number;
  /** How long a full snapshot is served without re-fetching Arr. Default 5 minutes. */
  staleMs?: number;
  /** Items kept in the durable head cache. Default 60. */
  headSize?: number;
  /** Optional SQLite-backed index for restart-safe hydrate/persist. */
  durable?: {
    loadMovies?: (instanceId: string) => InstanceMovieSnapshot | undefined;
    loadSeries?: (instanceId: string) => InstanceSeriesSnapshot | undefined;
    loadArtists?: (instanceId: string) => InstanceArtistSnapshot | undefined;
    saveMovies?: (instanceId: string, movies: MovieListItem[], fetchedAt: number) => void;
    saveSeries?: (instanceId: string, series: SeriesListItem[], fetchedAt: number) => void;
    saveArtists?: (instanceId: string, artists: ArtistListItem[], fetchedAt: number) => void;
  };
  /** Called after a successful Arr refresh (for revision bumps, etc.). */
  onLibraryUpdated?: (instanceId: string, kind: "movie" | "series" | "artist") => void;
};

export type LibraryReadOptions = {
  /** Bypass TTL and pull a fresh snapshot from Arr. */
  force?: boolean;
  /** Return only the first N title-sorted items (serves durable head when possible). */
  limit?: number;
};

export type MoviesCacheResult = {
  movies: MovieListItem[];
  status: CacheStatus;
  fetchedAt?: string;
  total: number;
  truncated: boolean;
};

export type SeriesCacheResult = {
  series: SeriesListItem[];
  status: CacheStatus;
  fetchedAt?: string;
  total: number;
  truncated: boolean;
};

export type ArtistsCacheResult = {
  artists: ArtistListItem[];
  status: CacheStatus;
  fetchedAt?: string;
  total: number;
  truncated: boolean;
};

function sortByTitle<T extends { sortTitle?: string; title: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    (a.sortTitle ?? a.title).localeCompare(b.sortTitle ?? b.title, undefined, {
      sensitivity: "base",
    }),
  );
}

function worstStatus(statuses: CacheStatus[]): CacheStatus {
  if (statuses.includes("MISS")) return "MISS";
  if (statuses.includes("STALE")) return "STALE";
  return "HIT";
}

const DEFAULT_STALE_MS = 5 * 60_000;
export const DEFAULT_LIBRARY_HEAD_SIZE = 60;

/**
 * In-memory library snapshots per Arr instance.
 * Movies for Radarr, series for Sonarr, artists for Lidarr.
 * Full snapshots revalidate after `staleMs` or `force`.
 * Durable heads survive full TTL so `?limit=` stays fast.
 */
export class LibraryCache {
  private readonly movieSnapshots = new Map<string, InstanceMovieSnapshot>();
  private readonly seriesSnapshots = new Map<string, InstanceSeriesSnapshot>();
  private readonly artistSnapshots = new Map<string, InstanceArtistSnapshot>();
  private readonly movieHeads = new Map<string, HeadSnapshot<MovieListItem>>();
  private readonly seriesHeads = new Map<string, HeadSnapshot<SeriesListItem>>();
  private readonly artistHeads = new Map<string, HeadSnapshot<ArtistListItem>>();
  private readonly movieInflight = new Map<string, Promise<InstanceMovieSnapshot>>();
  private readonly seriesInflight = new Map<string, Promise<InstanceSeriesSnapshot>>();
  private readonly artistInflight = new Map<string, Promise<InstanceArtistSnapshot>>();
  private readonly fetchMovies: (instance: Instance) => Promise<MovieListItem[]>;
  private readonly fetchSeries: (instance: Instance) => Promise<SeriesListItem[]>;
  private readonly fetchArtists: (instance: Instance) => Promise<ArtistListItem[]>;
  private readonly now: () => number;
  private readonly staleMs: number;
  private readonly headSize: number;
  private readonly durable: LibraryCacheDeps["durable"];
  private readonly onLibraryUpdated: LibraryCacheDeps["onLibraryUpdated"];

  constructor(options: LibraryCacheDeps = {}) {
    this.fetchMovies = options.fetchMovies ?? fetchMoviesForInstance;
    this.fetchSeries = options.fetchSeries ?? fetchSeriesForInstance;
    this.fetchArtists = options.fetchArtists ?? fetchArtistsForInstance;
    this.now = options.now ?? Date.now;
    this.staleMs = options.staleMs ?? DEFAULT_STALE_MS;
    this.headSize = options.headSize ?? DEFAULT_LIBRARY_HEAD_SIZE;
    this.durable = options.durable;
    this.onLibraryUpdated = options.onLibraryUpdated;
  }

  /** Load SQLite snapshots into memory so cold starts paint without waiting on Arr. */
  hydrateFromDurable(instances: Instance[]): number {
    if (!this.durable) return 0;
    let loaded = 0;
    for (const instance of instances) {
      if (instance.kind === "radarr" && !this.movieSnapshots.has(instance.id)) {
        const snap = this.durable.loadMovies?.(instance.id);
        if (snap) {
          this.movieSnapshots.set(instance.id, snap);
          this.storeMovieHead(instance.id, snap.movies, snap.fetchedAt);
          loaded += 1;
        }
      } else if (instance.kind === "sonarr" && !this.seriesSnapshots.has(instance.id)) {
        const snap = this.durable.loadSeries?.(instance.id);
        if (snap) {
          this.seriesSnapshots.set(instance.id, snap);
          this.storeSeriesHead(instance.id, snap.series, snap.fetchedAt);
          loaded += 1;
        }
      } else if (instance.kind === "lidarr" && !this.artistSnapshots.has(instance.id)) {
        const snap = this.durable.loadArtists?.(instance.id);
        if (snap) {
          this.artistSnapshots.set(instance.id, snap);
          this.storeArtistHead(instance.id, snap.artists, snap.fetchedAt);
          loaded += 1;
        }
      }
    }
    return loaded;
  }

  getSnapshot(instanceId: string): InstanceMovieSnapshot | undefined {
    return this.movieSnapshots.get(instanceId);
  }

  getSeriesSnapshot(instanceId: string): InstanceSeriesSnapshot | undefined {
    return this.seriesSnapshots.get(instanceId);
  }

  getArtistSnapshot(instanceId: string): InstanceArtistSnapshot | undefined {
    return this.artistSnapshots.get(instanceId);
  }

  invalidate(instanceId?: string): void {
    if (instanceId) {
      this.movieSnapshots.delete(instanceId);
      this.seriesSnapshots.delete(instanceId);
      this.artistSnapshots.delete(instanceId);
      this.movieHeads.delete(instanceId);
      this.seriesHeads.delete(instanceId);
      this.artistHeads.delete(instanceId);
      return;
    }
    this.movieSnapshots.clear();
    this.seriesSnapshots.clear();
    this.artistSnapshots.clear();
    this.movieHeads.clear();
    this.seriesHeads.clear();
    this.artistHeads.clear();
  }

  /**
   * Unique library totals from in-memory snapshots only — never hits Arr.
   * Returns undefined for a kind when no snapshot is loaded yet.
   */
  peekNavLibraryCounts(instances: Instance[]): {
    movies?: number;
    shows?: number;
    music?: number;
  } {
    const radarr = instances.filter((i) => i.kind === "radarr");
    const sonarr = instances.filter((i) => i.kind === "sonarr");
    const lidarr = instances.filter((i) => i.kind === "lidarr");
    const out: { movies?: number; shows?: number; music?: number } = {};

    if (radarr.length > 0 && radarr.some((i) => this.movieSnapshots.has(i.id))) {
      const movies = radarr.flatMap((i) => this.movieSnapshots.get(i.id)?.movies ?? []);
      out.movies = countUniqueMovies(movies);
    }
    if (sonarr.length > 0 && sonarr.some((i) => this.seriesSnapshots.has(i.id))) {
      const series = sonarr.flatMap((i) => this.seriesSnapshots.get(i.id)?.series ?? []);
      out.shows = countUniqueShows(series);
    }
    if (lidarr.length > 0 && lidarr.some((i) => this.artistSnapshots.has(i.id))) {
      const artists = lidarr.flatMap((i) => this.artistSnapshots.get(i.id)?.artists ?? []);
      out.music = countUniqueArtists(artists);
    }
    return out;
  }

  /** Prefetch into memory (startup / after adding a client). */
  warm(instances: Instance[]): void {
    for (const instance of instances) {
      if (instance.kind === "radarr") {
        if (this.movieSnapshots.has(instance.id) && this.isFresh(this.movieSnapshots.get(instance.id)!.fetchedAt)) {
          continue;
        }
        void this.refreshMovies(instance).catch((error) => {
          console.warn(`[cache] warm movies failed for ${instance.id}`, error);
        });
      } else if (instance.kind === "sonarr") {
        if (this.seriesSnapshots.has(instance.id) && this.isFresh(this.seriesSnapshots.get(instance.id)!.fetchedAt)) {
          continue;
        }
        void this.refreshSeries(instance).catch((error) => {
          console.warn(`[cache] warm series failed for ${instance.id}`, error);
        });
      } else if (instance.kind === "lidarr") {
        if (this.artistSnapshots.has(instance.id) && this.isFresh(this.artistSnapshots.get(instance.id)!.fetchedAt)) {
          continue;
        }
        void this.refreshArtists(instance).catch((error) => {
          console.warn(`[cache] warm artists failed for ${instance.id}`, error);
        });
      }
    }
  }

  async getMovies(
    instances: Instance[],
    options: LibraryReadOptions = {},
  ): Promise<MoviesCacheResult> {
    const radarr = instances.filter((i) => i.kind === "radarr");
    if (radarr.length === 0) {
      return { movies: [], status: "HIT", total: 0, truncated: false };
    }

    const limit = normalizeLimit(options.limit);
    if (limit != null && !options.force && radarr.every((i) => this.movieHeads.has(i.id))) {
      this.kickStaleMovieRefresh(radarr);
      const movies = sortByTitle(radarr.flatMap((i) => this.movieHeads.get(i.id)!.items)).slice(
        0,
        limit,
      );
      const total = radarr.reduce((sum, i) => sum + (this.movieHeads.get(i.id)?.total ?? 0), 0);
      const newest = radarr.reduce(
        (max, i) => Math.max(max, this.movieHeads.get(i.id)?.fetchedAt ?? 0),
        0,
      );
      return {
        movies,
        status: "HIT",
        total,
        truncated: movies.length < total,
        fetchedAt: newest > 0 ? new Date(newest).toISOString() : undefined,
      };
    }

    const statuses = await Promise.all(
      radarr.map((instance) => this.ensureMovies(instance, options.force)),
    );
    const all = sortByTitle(
      radarr.flatMap((instance) => this.movieSnapshots.get(instance.id)?.movies ?? []),
    );
    const newest = radarr.reduce((max, instance) => {
      const fetchedAt = this.movieSnapshots.get(instance.id)?.fetchedAt ?? 0;
      return Math.max(max, fetchedAt);
    }, 0);
    const movies = limit != null ? all.slice(0, limit) : all;

    return {
      movies,
      status: worstStatus(statuses),
      total: all.length,
      truncated: limit != null && movies.length < all.length,
      fetchedAt: newest > 0 ? new Date(newest).toISOString() : undefined,
    };
  }

  async getSeries(
    instances: Instance[],
    options: LibraryReadOptions = {},
  ): Promise<SeriesCacheResult> {
    const sonarr = instances.filter((i) => i.kind === "sonarr");
    if (sonarr.length === 0) {
      return { series: [], status: "HIT", total: 0, truncated: false };
    }

    const limit = normalizeLimit(options.limit);
    if (limit != null && !options.force && sonarr.every((i) => this.seriesHeads.has(i.id))) {
      this.kickStaleSeriesRefresh(sonarr);
      const series = sortByTitle(sonarr.flatMap((i) => this.seriesHeads.get(i.id)!.items)).slice(
        0,
        limit,
      );
      const total = sonarr.reduce((sum, i) => sum + (this.seriesHeads.get(i.id)?.total ?? 0), 0);
      const newest = sonarr.reduce(
        (max, i) => Math.max(max, this.seriesHeads.get(i.id)?.fetchedAt ?? 0),
        0,
      );
      return {
        series,
        status: "HIT",
        total,
        truncated: series.length < total,
        fetchedAt: newest > 0 ? new Date(newest).toISOString() : undefined,
      };
    }

    const statuses = await Promise.all(
      sonarr.map((instance) => this.ensureSeries(instance, options.force)),
    );
    const all = sortByTitle(
      sonarr.flatMap((instance) => this.seriesSnapshots.get(instance.id)?.series ?? []),
    );
    const newest = sonarr.reduce((max, instance) => {
      const fetchedAt = this.seriesSnapshots.get(instance.id)?.fetchedAt ?? 0;
      return Math.max(max, fetchedAt);
    }, 0);
    const series = limit != null ? all.slice(0, limit) : all;

    return {
      series,
      status: worstStatus(statuses),
      total: all.length,
      truncated: limit != null && series.length < all.length,
      fetchedAt: newest > 0 ? new Date(newest).toISOString() : undefined,
    };
  }

  async getArtists(
    instances: Instance[],
    options: LibraryReadOptions = {},
  ): Promise<ArtistsCacheResult> {
    const lidarr = instances.filter((i) => i.kind === "lidarr");
    if (lidarr.length === 0) {
      return { artists: [], status: "HIT", total: 0, truncated: false };
    }

    const limit = normalizeLimit(options.limit);
    if (limit != null && !options.force && lidarr.every((i) => this.artistHeads.has(i.id))) {
      this.kickStaleArtistRefresh(lidarr);
      const artists = sortByTitle(lidarr.flatMap((i) => this.artistHeads.get(i.id)!.items)).slice(
        0,
        limit,
      );
      const total = lidarr.reduce((sum, i) => sum + (this.artistHeads.get(i.id)?.total ?? 0), 0);
      const newest = lidarr.reduce(
        (max, i) => Math.max(max, this.artistHeads.get(i.id)?.fetchedAt ?? 0),
        0,
      );
      return {
        artists,
        status: "HIT",
        total,
        truncated: artists.length < total,
        fetchedAt: newest > 0 ? new Date(newest).toISOString() : undefined,
      };
    }

    const statuses = await Promise.all(
      lidarr.map((instance) => this.ensureArtists(instance, options.force)),
    );
    const all = sortByTitle(
      lidarr.flatMap((instance) => this.artistSnapshots.get(instance.id)?.artists ?? []),
    );
    const newest = lidarr.reduce((max, instance) => {
      const fetchedAt = this.artistSnapshots.get(instance.id)?.fetchedAt ?? 0;
      return Math.max(max, fetchedAt);
    }, 0);
    const artists = limit != null ? all.slice(0, limit) : all;

    return {
      artists,
      status: worstStatus(statuses),
      total: all.length,
      truncated: limit != null && artists.length < all.length,
      fetchedAt: newest > 0 ? new Date(newest).toISOString() : undefined,
    };
  }

  /** @deprecated Prefer refreshMovies — kept for call sites that refresh after movie mutations. */
  refresh(instance: Instance): Promise<InstanceMovieSnapshot> {
    return this.refreshMovies(instance);
  }

  refreshMovies(instance: Instance): Promise<InstanceMovieSnapshot> {
    const existing = this.movieInflight.get(instance.id);
    if (existing) return existing;

    const pending = this.doRefreshMovies(instance).finally(() => {
      this.movieInflight.delete(instance.id);
    });
    this.movieInflight.set(instance.id, pending);
    return pending;
  }

  refreshSeries(instance: Instance): Promise<InstanceSeriesSnapshot> {
    const existing = this.seriesInflight.get(instance.id);
    if (existing) return existing;

    const pending = this.doRefreshSeries(instance).finally(() => {
      this.seriesInflight.delete(instance.id);
    });
    this.seriesInflight.set(instance.id, pending);
    return pending;
  }

  refreshArtists(instance: Instance): Promise<InstanceArtistSnapshot> {
    const existing = this.artistInflight.get(instance.id);
    if (existing) return existing;

    const pending = this.doRefreshArtists(instance).finally(() => {
      this.artistInflight.delete(instance.id);
    });
    this.artistInflight.set(instance.id, pending);
    return pending;
  }

  private isFresh(fetchedAt: number): boolean {
    return this.now() - fetchedAt < this.staleMs;
  }

  private kickStaleMovieRefresh(instances: Instance[]): void {
    for (const instance of instances) {
      const snap = this.movieSnapshots.get(instance.id);
      if (!snap || !this.isFresh(snap.fetchedAt)) {
        void this.refreshMovies(instance).catch((error) => {
          console.warn(`[cache] background movies refresh failed for ${instance.id}`, error);
        });
      }
    }
  }

  private kickStaleSeriesRefresh(instances: Instance[]): void {
    for (const instance of instances) {
      const snap = this.seriesSnapshots.get(instance.id);
      if (!snap || !this.isFresh(snap.fetchedAt)) {
        void this.refreshSeries(instance).catch((error) => {
          console.warn(`[cache] background series refresh failed for ${instance.id}`, error);
        });
      }
    }
  }

  private kickStaleArtistRefresh(instances: Instance[]): void {
    for (const instance of instances) {
      const snap = this.artistSnapshots.get(instance.id);
      if (!snap || !this.isFresh(snap.fetchedAt)) {
        void this.refreshArtists(instance).catch((error) => {
          console.warn(`[cache] background artists refresh failed for ${instance.id}`, error);
        });
      }
    }
  }

  private storeMovieHead(instanceId: string, movies: MovieListItem[], fetchedAt: number): void {
    const sorted = sortByTitle(movies);
    this.movieHeads.set(instanceId, {
      items: sorted.slice(0, this.headSize),
      total: sorted.length,
      fetchedAt,
    });
  }

  private storeSeriesHead(instanceId: string, series: SeriesListItem[], fetchedAt: number): void {
    const sorted = sortByTitle(series);
    this.seriesHeads.set(instanceId, {
      items: sorted.slice(0, this.headSize),
      total: sorted.length,
      fetchedAt,
    });
  }

  private storeArtistHead(instanceId: string, artists: ArtistListItem[], fetchedAt: number): void {
    const sorted = sortByTitle(artists);
    this.artistHeads.set(instanceId, {
      items: sorted.slice(0, this.headSize),
      total: sorted.length,
      fetchedAt,
    });
  }

  private async ensureMovies(instance: Instance, force = false): Promise<CacheStatus> {
    let snap = this.movieSnapshots.get(instance.id);
    if (!snap && this.durable?.loadMovies) {
      const durable = this.durable.loadMovies(instance.id);
      if (durable) {
        this.movieSnapshots.set(instance.id, durable);
        this.storeMovieHead(instance.id, durable.movies, durable.fetchedAt);
        snap = durable;
      }
    }
    if (!force && snap && this.isFresh(snap.fetchedAt)) return "HIT";
    if (!force && snap) {
      void this.refreshMovies(instance).catch((error) => {
        console.warn(`[cache] background movies refresh failed for ${instance.id}`, error);
      });
      return "STALE";
    }
    await this.refreshMovies(instance);
    return snap ? "STALE" : "MISS";
  }

  private async ensureSeries(instance: Instance, force = false): Promise<CacheStatus> {
    let snap = this.seriesSnapshots.get(instance.id);
    if (!snap && this.durable?.loadSeries) {
      const durable = this.durable.loadSeries(instance.id);
      if (durable) {
        this.seriesSnapshots.set(instance.id, durable);
        this.storeSeriesHead(instance.id, durable.series, durable.fetchedAt);
        snap = durable;
      }
    }
    if (!force && snap && this.isFresh(snap.fetchedAt)) return "HIT";
    if (!force && snap) {
      void this.refreshSeries(instance).catch((error) => {
        console.warn(`[cache] background series refresh failed for ${instance.id}`, error);
      });
      return "STALE";
    }
    await this.refreshSeries(instance);
    return snap ? "STALE" : "MISS";
  }

  private async ensureArtists(instance: Instance, force = false): Promise<CacheStatus> {
    let snap = this.artistSnapshots.get(instance.id);
    if (!snap && this.durable?.loadArtists) {
      const durable = this.durable.loadArtists(instance.id);
      if (durable) {
        this.artistSnapshots.set(instance.id, durable);
        this.storeArtistHead(instance.id, durable.artists, durable.fetchedAt);
        snap = durable;
      }
    }
    if (!force && snap && this.isFresh(snap.fetchedAt)) return "HIT";
    if (!force && snap) {
      void this.refreshArtists(instance).catch((error) => {
        console.warn(`[cache] background artists refresh failed for ${instance.id}`, error);
      });
      return "STALE";
    }
    await this.refreshArtists(instance);
    return snap ? "STALE" : "MISS";
  }

  private async doRefreshMovies(instance: Instance): Promise<InstanceMovieSnapshot> {
    const previous = this.movieSnapshots.get(instance.id);
    try {
      const movies = await this.fetchMovies(instance);
      const snap: InstanceMovieSnapshot = {
        instanceId: instance.id,
        fetchedAt: this.now(),
        movies,
      };
      this.movieSnapshots.set(instance.id, snap);
      this.storeMovieHead(instance.id, movies, snap.fetchedAt);
      try {
        this.durable?.saveMovies?.(instance.id, movies, snap.fetchedAt);
      } catch (error) {
        console.warn(`[cache] persist movies failed for ${instance.id}`, error);
      }
      this.onLibraryUpdated?.(instance.id, "movie");
      return snap;
    } catch (error) {
      if (previous) {
        console.warn(`[cache] refresh movies failed for ${instance.id}; keeping snapshot`, error);
        return previous;
      }
      throw error;
    }
  }

  private async doRefreshSeries(instance: Instance): Promise<InstanceSeriesSnapshot> {
    const previous = this.seriesSnapshots.get(instance.id);
    try {
      const series = await this.fetchSeries(instance);
      const snap: InstanceSeriesSnapshot = {
        instanceId: instance.id,
        fetchedAt: this.now(),
        series,
      };
      this.seriesSnapshots.set(instance.id, snap);
      this.storeSeriesHead(instance.id, series, snap.fetchedAt);
      try {
        this.durable?.saveSeries?.(instance.id, series, snap.fetchedAt);
      } catch (error) {
        console.warn(`[cache] persist series failed for ${instance.id}`, error);
      }
      this.onLibraryUpdated?.(instance.id, "series");
      return snap;
    } catch (error) {
      if (previous) {
        console.warn(`[cache] refresh series failed for ${instance.id}; keeping snapshot`, error);
        return previous;
      }
      throw error;
    }
  }

  private async doRefreshArtists(instance: Instance): Promise<InstanceArtistSnapshot> {
    const previous = this.artistSnapshots.get(instance.id);
    try {
      const artists = await this.fetchArtists(instance);
      const snap: InstanceArtistSnapshot = {
        instanceId: instance.id,
        fetchedAt: this.now(),
        artists,
      };
      this.artistSnapshots.set(instance.id, snap);
      this.storeArtistHead(instance.id, artists, snap.fetchedAt);
      try {
        this.durable?.saveArtists?.(instance.id, artists, snap.fetchedAt);
      } catch (error) {
        console.warn(`[cache] persist artists failed for ${instance.id}`, error);
      }
      this.onLibraryUpdated?.(instance.id, "artist");
      return snap;
    } catch (error) {
      if (previous) {
        console.warn(`[cache] refresh artists failed for ${instance.id}; keeping snapshot`, error);
        return previous;
      }
      throw error;
    }
  }
}

function normalizeLimit(limit: number | undefined): number | undefined {
  if (limit == null || !Number.isFinite(limit)) return undefined;
  const n = Math.floor(limit);
  if (n <= 0) return undefined;
  return n;
}
