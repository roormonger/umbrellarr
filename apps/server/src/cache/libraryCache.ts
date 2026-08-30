import type {
  ArtistListItem,
  CacheStatus,
  Instance,
  MovieListItem,
  SeriesListItem,
} from "@umbrellarr/shared";
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

export type LibraryCacheDeps = {
  fetchMovies?: (instance: Instance) => Promise<MovieListItem[]>;
  fetchSeries?: (instance: Instance) => Promise<SeriesListItem[]>;
  fetchArtists?: (instance: Instance) => Promise<ArtistListItem[]>;
  now?: () => number;
  /** How long a snapshot is served without re-fetching Arr. Default 60s. */
  staleMs?: number;
};

export type LibraryReadOptions = {
  /** Bypass TTL and pull a fresh snapshot from Arr. */
  force?: boolean;
};

export type MoviesCacheResult = {
  movies: MovieListItem[];
  status: CacheStatus;
  fetchedAt?: string;
};

export type SeriesCacheResult = {
  series: SeriesListItem[];
  status: CacheStatus;
  fetchedAt?: string;
};

export type ArtistsCacheResult = {
  artists: ArtistListItem[];
  status: CacheStatus;
  fetchedAt?: string;
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

const DEFAULT_STALE_MS = 60_000;

/**
 * In-memory library snapshots per Arr instance.
 * Movies for Radarr, series for Sonarr, artists for Lidarr.
 * Populated on demand / warm; revalidated after `staleMs` or `force`.
 * Also invalidated after Umbrellarr mutations.
 */
export class LibraryCache {
  private readonly movieSnapshots = new Map<string, InstanceMovieSnapshot>();
  private readonly seriesSnapshots = new Map<string, InstanceSeriesSnapshot>();
  private readonly artistSnapshots = new Map<string, InstanceArtistSnapshot>();
  private readonly movieInflight = new Map<string, Promise<InstanceMovieSnapshot>>();
  private readonly seriesInflight = new Map<string, Promise<InstanceSeriesSnapshot>>();
  private readonly artistInflight = new Map<string, Promise<InstanceArtistSnapshot>>();
  private readonly fetchMovies: (instance: Instance) => Promise<MovieListItem[]>;
  private readonly fetchSeries: (instance: Instance) => Promise<SeriesListItem[]>;
  private readonly fetchArtists: (instance: Instance) => Promise<ArtistListItem[]>;
  private readonly now: () => number;
  private readonly staleMs: number;

  constructor(options: LibraryCacheDeps = {}) {
    this.fetchMovies = options.fetchMovies ?? fetchMoviesForInstance;
    this.fetchSeries = options.fetchSeries ?? fetchSeriesForInstance;
    this.fetchArtists = options.fetchArtists ?? fetchArtistsForInstance;
    this.now = options.now ?? Date.now;
    this.staleMs = options.staleMs ?? DEFAULT_STALE_MS;
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
      return;
    }
    this.movieSnapshots.clear();
    this.seriesSnapshots.clear();
    this.artistSnapshots.clear();
  }

  /** Prefetch into memory (e.g. after adding a client). */
  warm(instances: Instance[]): void {
    for (const instance of instances) {
      if (instance.kind === "radarr") {
        if (this.movieSnapshots.has(instance.id)) continue;
        void this.refreshMovies(instance).catch((error) => {
          console.warn(`[cache] warm movies failed for ${instance.id}`, error);
        });
      } else if (instance.kind === "sonarr") {
        if (this.seriesSnapshots.has(instance.id)) continue;
        void this.refreshSeries(instance).catch((error) => {
          console.warn(`[cache] warm series failed for ${instance.id}`, error);
        });
      } else if (instance.kind === "lidarr") {
        if (this.artistSnapshots.has(instance.id)) continue;
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
      return { movies: [], status: "HIT" };
    }

    const statuses = await Promise.all(
      radarr.map((instance) => this.ensureMovies(instance, options.force)),
    );
    const movies = sortByTitle(
      radarr.flatMap((instance) => this.movieSnapshots.get(instance.id)?.movies ?? []),
    );
    const newest = radarr.reduce((max, instance) => {
      const fetchedAt = this.movieSnapshots.get(instance.id)?.fetchedAt ?? 0;
      return Math.max(max, fetchedAt);
    }, 0);

    return {
      movies,
      status: worstStatus(statuses),
      fetchedAt: newest > 0 ? new Date(newest).toISOString() : undefined,
    };
  }

  async getSeries(
    instances: Instance[],
    options: LibraryReadOptions = {},
  ): Promise<SeriesCacheResult> {
    const sonarr = instances.filter((i) => i.kind === "sonarr");
    if (sonarr.length === 0) {
      return { series: [], status: "HIT" };
    }

    const statuses = await Promise.all(
      sonarr.map((instance) => this.ensureSeries(instance, options.force)),
    );
    const series = sortByTitle(
      sonarr.flatMap((instance) => this.seriesSnapshots.get(instance.id)?.series ?? []),
    );
    const newest = sonarr.reduce((max, instance) => {
      const fetchedAt = this.seriesSnapshots.get(instance.id)?.fetchedAt ?? 0;
      return Math.max(max, fetchedAt);
    }, 0);

    return {
      series,
      status: worstStatus(statuses),
      fetchedAt: newest > 0 ? new Date(newest).toISOString() : undefined,
    };
  }

  async getArtists(
    instances: Instance[],
    options: LibraryReadOptions = {},
  ): Promise<ArtistsCacheResult> {
    const lidarr = instances.filter((i) => i.kind === "lidarr");
    if (lidarr.length === 0) {
      return { artists: [], status: "HIT" };
    }

    const statuses = await Promise.all(
      lidarr.map((instance) => this.ensureArtists(instance, options.force)),
    );
    const artists = sortByTitle(
      lidarr.flatMap((instance) => this.artistSnapshots.get(instance.id)?.artists ?? []),
    );
    const newest = lidarr.reduce((max, instance) => {
      const fetchedAt = this.artistSnapshots.get(instance.id)?.fetchedAt ?? 0;
      return Math.max(max, fetchedAt);
    }, 0);

    return {
      artists,
      status: worstStatus(statuses),
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

  private async ensureMovies(instance: Instance, force = false): Promise<CacheStatus> {
    const snap = this.movieSnapshots.get(instance.id);
    if (!force && snap && this.isFresh(snap.fetchedAt)) return "HIT";
    await this.refreshMovies(instance);
    return snap ? "STALE" : "MISS";
  }

  private async ensureSeries(instance: Instance, force = false): Promise<CacheStatus> {
    const snap = this.seriesSnapshots.get(instance.id);
    if (!force && snap && this.isFresh(snap.fetchedAt)) return "HIT";
    await this.refreshSeries(instance);
    return snap ? "STALE" : "MISS";
  }

  private async ensureArtists(instance: Instance, force = false): Promise<CacheStatus> {
    const snap = this.artistSnapshots.get(instance.id);
    if (!force && snap && this.isFresh(snap.fetchedAt)) return "HIT";
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
