import type { CacheStatus, Instance, MovieListItem } from "@umbrellarr/shared";
import { fetchMoviesForInstance } from "../servarr/movies.js";

export type InstanceMovieSnapshot = {
  instanceId: string;
  fetchedAt: number;
  movies: MovieListItem[];
};

export type LibraryCacheDeps = {
  fetchMovies?: (instance: Instance) => Promise<MovieListItem[]>;
  now?: () => number;
};

export type MoviesCacheResult = {
  movies: MovieListItem[];
  status: CacheStatus;
  fetchedAt?: string;
};

function sortMovies(movies: MovieListItem[]): MovieListItem[] {
  return [...movies].sort((a, b) =>
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
 * In-memory library snapshots per Radarr instance.
 * Populated on demand (or via warm); invalidated / refreshed after mutations.
 * No disk persistence, poller, or Arr signal fingerprinting.
 */
export class LibraryCache {
  private readonly snapshots = new Map<string, InstanceMovieSnapshot>();
  private readonly inflight = new Map<string, Promise<InstanceMovieSnapshot>>();
  private readonly fetchMovies: (instance: Instance) => Promise<MovieListItem[]>;
  private readonly now: () => number;

  constructor(options: LibraryCacheDeps = {}) {
    this.fetchMovies = options.fetchMovies ?? fetchMoviesForInstance;
    this.now = options.now ?? Date.now;
  }

  getSnapshot(instanceId: string): InstanceMovieSnapshot | undefined {
    return this.snapshots.get(instanceId);
  }

  invalidate(instanceId?: string): void {
    if (instanceId) {
      this.snapshots.delete(instanceId);
      return;
    }
    this.snapshots.clear();
  }

  /** Prefetch into memory (e.g. after adding a Radarr client). */
  warm(instances: Instance[]): void {
    for (const instance of instances.filter((i) => i.kind === "radarr")) {
      if (this.snapshots.has(instance.id)) continue;
      void this.refresh(instance).catch((error) => {
        console.warn(`[cache] warm failed for ${instance.id}`, error);
      });
    }
  }

  async getMovies(instances: Instance[]): Promise<MoviesCacheResult> {
    const radarr = instances.filter((i) => i.kind === "radarr");
    if (radarr.length === 0) {
      return { movies: [], status: "HIT" };
    }

    const statuses = await Promise.all(radarr.map((instance) => this.ensureInstance(instance)));
    const movies = sortMovies(
      radarr.flatMap((instance) => this.snapshots.get(instance.id)?.movies ?? []),
    );
    const newest = radarr.reduce((max, instance) => {
      const fetchedAt = this.snapshots.get(instance.id)?.fetchedAt ?? 0;
      return Math.max(max, fetchedAt);
    }, 0);

    return {
      movies,
      status: worstStatus(statuses),
      fetchedAt: newest > 0 ? new Date(newest).toISOString() : undefined,
    };
  }

  private async ensureInstance(instance: Instance): Promise<CacheStatus> {
    if (this.snapshots.has(instance.id)) {
      return "HIT";
    }
    await this.refresh(instance);
    return "MISS";
  }

  refresh(instance: Instance): Promise<InstanceMovieSnapshot> {
    const existing = this.inflight.get(instance.id);
    if (existing) return existing;

    const pending = this.doRefresh(instance).finally(() => {
      this.inflight.delete(instance.id);
    });
    this.inflight.set(instance.id, pending);
    return pending;
  }

  private async doRefresh(instance: Instance): Promise<InstanceMovieSnapshot> {
    const previous = this.snapshots.get(instance.id);
    try {
      const movies = await this.fetchMovies(instance);
      const snap: InstanceMovieSnapshot = {
        instanceId: instance.id,
        fetchedAt: this.now(),
        movies,
      };
      this.snapshots.set(instance.id, snap);
      return snap;
    } catch (error) {
      if (previous) {
        console.warn(`[cache] refresh failed for ${instance.id}; keeping snapshot`, error);
        return previous;
      }
      throw error;
    }
  }
}
