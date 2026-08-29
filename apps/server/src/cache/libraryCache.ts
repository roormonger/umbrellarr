import type { CacheStatus, Instance, MovieListItem, SeriesListItem } from "@umbrellarr/shared";
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

export type LibraryCacheDeps = {
  fetchMovies?: (instance: Instance) => Promise<MovieListItem[]>;
  fetchSeries?: (instance: Instance) => Promise<SeriesListItem[]>;
  now?: () => number;
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

function sortByTitle<T extends { sortTitle?: string; title: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    (a.sortTitle ?? a.title).localeCompare(b.sortTitle ?? b.title, undefined, {
      sensitivity: "base",
    }),
  );
}

function worstStatus(statuses: CacheStatus[]): CacheStatus {
  if (statuses.includes("MISS")) return "MISS";
  return "HIT";
}

/**
 * In-memory library snapshots per Arr instance.
 * Movies for Radarr, series for Sonarr. Populated on demand / warm; invalidated after mutations.
 */
export class LibraryCache {
  private readonly movieSnapshots = new Map<string, InstanceMovieSnapshot>();
  private readonly seriesSnapshots = new Map<string, InstanceSeriesSnapshot>();
  private readonly movieInflight = new Map<string, Promise<InstanceMovieSnapshot>>();
  private readonly seriesInflight = new Map<string, Promise<InstanceSeriesSnapshot>>();
  private readonly fetchMovies: (instance: Instance) => Promise<MovieListItem[]>;
  private readonly fetchSeries: (instance: Instance) => Promise<SeriesListItem[]>;
  private readonly now: () => number;

  constructor(options: LibraryCacheDeps = {}) {
    this.fetchMovies = options.fetchMovies ?? fetchMoviesForInstance;
    this.fetchSeries = options.fetchSeries ?? fetchSeriesForInstance;
    this.now = options.now ?? Date.now;
  }

  getSnapshot(instanceId: string): InstanceMovieSnapshot | undefined {
    return this.movieSnapshots.get(instanceId);
  }

  getSeriesSnapshot(instanceId: string): InstanceSeriesSnapshot | undefined {
    return this.seriesSnapshots.get(instanceId);
  }

  invalidate(instanceId?: string): void {
    if (instanceId) {
      this.movieSnapshots.delete(instanceId);
      this.seriesSnapshots.delete(instanceId);
      return;
    }
    this.movieSnapshots.clear();
    this.seriesSnapshots.clear();
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
      }
    }
  }

  async getMovies(instances: Instance[]): Promise<MoviesCacheResult> {
    const radarr = instances.filter((i) => i.kind === "radarr");
    if (radarr.length === 0) {
      return { movies: [], status: "HIT" };
    }

    const statuses = await Promise.all(radarr.map((instance) => this.ensureMovies(instance)));
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

  async getSeries(instances: Instance[]): Promise<SeriesCacheResult> {
    const sonarr = instances.filter((i) => i.kind === "sonarr");
    if (sonarr.length === 0) {
      return { series: [], status: "HIT" };
    }

    const statuses = await Promise.all(sonarr.map((instance) => this.ensureSeries(instance)));
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

  private async ensureMovies(instance: Instance): Promise<CacheStatus> {
    if (this.movieSnapshots.has(instance.id)) return "HIT";
    await this.refreshMovies(instance);
    return "MISS";
  }

  private async ensureSeries(instance: Instance): Promise<CacheStatus> {
    if (this.seriesSnapshots.has(instance.id)) return "HIT";
    await this.refreshSeries(instance);
    return "MISS";
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
}
