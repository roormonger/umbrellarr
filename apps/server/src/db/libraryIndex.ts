import { and, eq } from "drizzle-orm";
import type {
  ArtistListItem,
  MovieListItem,
  SeriesListItem,
} from "@umbrellarr/shared";
import type { AppDatabase } from "./client.js";
import { libraryItemsTable, librarySnapshotsTable } from "./schema.js";

export type LibraryKind = "movie" | "series" | "artist";

export type DurableMovieSnapshot = {
  instanceId: string;
  fetchedAt: number;
  movies: MovieListItem[];
};

export type DurableSeriesSnapshot = {
  instanceId: string;
  fetchedAt: number;
  series: SeriesListItem[];
};

export type DurableArtistSnapshot = {
  instanceId: string;
  fetchedAt: number;
  artists: ArtistListItem[];
};

type ItemMeta = {
  arrId: number;
  title: string;
  sortTitle: string;
  tmdbId: number | null;
  tvdbId: number | null;
  imdbId: string | null;
  foreignArtistId: string | null;
};

/**
 * Durable library index in SQLite. Arr remains source of truth;
 * this is a restart-safe cache of list-shaped payloads.
 */
export class LibraryIndexStore {
  constructor(private readonly db: AppDatabase) {}

  loadMovies(instanceId: string): DurableMovieSnapshot | undefined {
    const items = this.loadItems<MovieListItem>(instanceId, "movie");
    if (!items) return undefined;
    return { instanceId, fetchedAt: items.fetchedAt, movies: items.rows };
  }

  loadSeries(instanceId: string): DurableSeriesSnapshot | undefined {
    const items = this.loadItems<SeriesListItem>(instanceId, "series");
    if (!items) return undefined;
    return { instanceId, fetchedAt: items.fetchedAt, series: items.rows };
  }

  loadArtists(instanceId: string): DurableArtistSnapshot | undefined {
    const items = this.loadItems<ArtistListItem>(instanceId, "artist");
    if (!items) return undefined;
    return { instanceId, fetchedAt: items.fetchedAt, artists: items.rows };
  }

  saveMovies(instanceId: string, movies: MovieListItem[], fetchedAt: number): void {
    this.saveSnapshot(instanceId, "movie", movies, fetchedAt, (item) => ({
      arrId: item.externalId,
      title: item.title,
      sortTitle: item.sortTitle ?? item.title,
      tmdbId: item.tmdbId ?? null,
      tvdbId: null,
      imdbId: null,
      foreignArtistId: null,
    }));
  }

  saveSeries(instanceId: string, series: SeriesListItem[], fetchedAt: number): void {
    this.saveSnapshot(instanceId, "series", series, fetchedAt, (item) => ({
      arrId: item.externalId,
      title: item.title,
      sortTitle: item.sortTitle ?? item.title,
      tmdbId: item.tmdbId ?? null,
      tvdbId: item.tvdbId ?? null,
      imdbId: item.imdbId ?? null,
      foreignArtistId: null,
    }));
  }

  saveArtists(instanceId: string, artists: ArtistListItem[], fetchedAt: number): void {
    this.saveSnapshot(instanceId, "artist", artists, fetchedAt, (item) => ({
      arrId: item.externalId,
      title: item.title,
      sortTitle: item.sortTitle ?? item.title,
      tmdbId: null,
      tvdbId: null,
      imdbId: null,
      foreignArtistId: item.foreignArtistId ?? null,
    }));
  }

  private loadItems<T>(
    instanceId: string,
    kind: LibraryKind,
  ): { rows: T[]; fetchedAt: number } | undefined {
    const snapKey = snapshotKey(instanceId, kind);
    const row = this.db
      .select()
      .from(librarySnapshotsTable)
      .where(eq(librarySnapshotsTable.instanceId, snapKey))
      .get();
    if (row) {
      try {
        const parsed = JSON.parse(row.payload) as T[];
        if (Array.isArray(parsed)) {
          return { rows: parsed, fetchedAt: row.fetchedAt };
        }
      } catch {
        /* fall through to row rebuild */
      }
    }

    const itemRows = this.db
      .select()
      .from(libraryItemsTable)
      .where(
        and(eq(libraryItemsTable.instanceId, instanceId), eq(libraryItemsTable.kind, kind)),
      )
      .all();
    if (itemRows.length === 0) return undefined;
    const rows: T[] = [];
    let fetchedAt = 0;
    for (const item of itemRows) {
      try {
        rows.push(JSON.parse(item.payload) as T);
        fetchedAt = Math.max(fetchedAt, item.updatedAt);
      } catch {
        /* skip corrupt row */
      }
    }
    if (rows.length === 0) return undefined;
    return { rows, fetchedAt };
  }

  private saveSnapshot<T>(
    instanceId: string,
    kind: LibraryKind,
    items: T[],
    fetchedAt: number,
    meta: (item: T) => ItemMeta,
  ): void {
    const snapKey = snapshotKey(instanceId, kind);
    const now = Date.now();
    this.db
      .insert(librarySnapshotsTable)
      .values({
        instanceId: snapKey,
        kind,
        payload: JSON.stringify(items),
        itemCount: items.length,
        fetchedAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: librarySnapshotsTable.instanceId,
        set: {
          kind,
          payload: JSON.stringify(items),
          itemCount: items.length,
          fetchedAt,
          updatedAt: now,
        },
      })
      .run();

    this.db
      .delete(libraryItemsTable)
      .where(
        and(eq(libraryItemsTable.instanceId, instanceId), eq(libraryItemsTable.kind, kind)),
      )
      .run();

    if (items.length === 0) return;

    const chunkSize = 200;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      this.db
        .insert(libraryItemsTable)
        .values(
          chunk.map((item) => {
            const m = meta(item);
            return {
              instanceId,
              kind,
              arrId: m.arrId,
              title: m.title,
              sortTitle: m.sortTitle,
              tmdbId: m.tmdbId,
              tvdbId: m.tvdbId,
              imdbId: m.imdbId,
              foreignArtistId: m.foreignArtistId,
              payload: JSON.stringify(item),
              updatedAt: now,
            };
          }),
        )
        .run();
    }
  }
}

function snapshotKey(instanceId: string, kind: LibraryKind): string {
  return `${instanceId}:${kind}`;
}
