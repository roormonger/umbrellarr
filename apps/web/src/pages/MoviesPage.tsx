import {
  Alert,
  Group,
  Skeleton,
  Text,
  TextInput,
} from "@mantine/core";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { useParams } from "@tanstack/react-router";
import {
  MovieFilterKeySchema,
  MovieSortDirectionSchema,
  MovieSortKeySchema,
  type MovieFilterKey,
  type MovieSortDirection,
  type MovieSortKey,
} from "@umbrellarr/shared";
import { useCallback, useMemo, useRef, useState } from "react";
import { listInstances } from "@/api/instances";
import { listMovies } from "@/api/movies";
import { AlphabetJumper } from "@/components/media/AlphabetJumper";
import { MovieEditModal } from "@/components/movies/MovieEditModal";
import {
  MoviesToolbar,
  POSTER_SIZE_DEFAULT,
  POSTER_SIZE_MAX,
  POSTER_SIZE_MIN,
} from "@/components/movies/MoviesToolbar";
import { VirtualizedMovieGrid } from "@/components/movies/VirtualizedMovieGrid";
import { usePageHeader } from "@/layout/pageHeader";
import { letterKey, type AlphabetKey } from "@/lib/alphabet";
import {
  applyMovieQuery,
  filterMovies,
  sortMovies,
} from "@/lib/movieSortFilter";
import { getPosterScale } from "@/lib/posterScale";
import type { MovieListItem } from "@umbrellarr/shared";
import classes from "./MoviesPage.module.css";

const SORT_KEY_STORAGE = "umbrellarr.movies.sortKey";
const SORT_DIR_STORAGE = "umbrellarr.movies.sortDirection";
const FILTER_STORAGE = "umbrellarr.movies.filterKey";
const POSTER_SIZE_STORAGE = "umbrellarr.movies.posterSize";

function readStoredSortKey(): MovieSortKey {
  const raw = localStorage.getItem(SORT_KEY_STORAGE);
  const parsed = MovieSortKeySchema.safeParse(raw);
  return parsed.success ? parsed.data : "title";
}

function readStoredSortDirection(): MovieSortDirection {
  const raw = localStorage.getItem(SORT_DIR_STORAGE);
  const parsed = MovieSortDirectionSchema.safeParse(raw);
  return parsed.success ? parsed.data : "asc";
}

function readStoredFilter(): MovieFilterKey {
  const raw = localStorage.getItem(FILTER_STORAGE);
  const parsed = MovieFilterKeySchema.safeParse(raw);
  return parsed.success ? parsed.data : "all";
}

function readStoredPosterSize(): number {
  const raw = Number(localStorage.getItem(POSTER_SIZE_STORAGE));
  if (!Number.isFinite(raw)) return POSTER_SIZE_DEFAULT;
  return Math.min(POSTER_SIZE_MAX, Math.max(POSTER_SIZE_MIN, raw));
}

export function MoviesPage() {
  const queryClient = useQueryClient();
  const { instanceId } = useParams({ from: "/app/movies/$instanceId" });
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<MovieSortKey>(readStoredSortKey);
  const [sortDirection, setSortDirection] = useState<MovieSortDirection>(readStoredSortDirection);
  const [filterKey, setFilterKey] = useState<MovieFilterKey>(readStoredFilter);
  const [posterSize, setPosterSize] = useState(readStoredPosterSize);
  const [previewSize, setPreviewSize] = useState(readStoredPosterSize);
  const [activeLetter, setActiveLetter] = useState<string>("#");
  const [editingMovie, setEditingMovie] = useState<MovieListItem | null>(null);
  const jumperRef = useRef<((letter: AlphabetKey) => void) | null>(null);
  /** Size when the current slider drag began — mode (scale vs live layout) is relative to this. */
  const dragOriginRef = useRef<number | null>(null);

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  const instanceName =
    instancesQuery.data?.instances.find((i) => i.id === instanceId)?.name ?? "Movies";

  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ["movies", instanceId],
    queryFn: () => listMovies(instanceId),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: "always",
  });

  /** Only block the grid when we have nothing to show (avoid skeleton flash on cached return). */
  const showSkeleton = isPending && !data;

  const movies = useMemo(() => {
    const items = data?.movies ?? [];
    const filtered = filterMovies(items, filterKey);
    const searched = applyMovieQuery(filtered, query);
    return sortMovies(searched, sortKey, sortDirection);
  }, [data?.movies, filterKey, query, sortKey, sortDirection]);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const movie of movies) {
      set.add(letterKey(movie.sortTitle ?? movie.title));
    }
    return set;
  }, [movies]);

  const headerCount = useMemo(() => {
    if (data?.movies.length == null) return showSkeleton || isFetching ? "Loading…" : null;
    const total = data.movies.length;
    const shown = movies.length;
    const totalLabel = total.toLocaleString();
    if (shown !== total) return `${shown.toLocaleString()} of ${totalLabel}`;
    return totalLabel;
  }, [data?.movies.length, movies.length, showSkeleton, isFetching]);

  usePageHeader(instanceName, headerCount);

  const skeletonStyle = useMemo(() => getPosterScale(previewSize).style, [previewSize]);

  // Zooming in: CSS scale preview (no relayout). Zooming out: live layout so new columns fill the gap.
  const dragOrigin = dragOriginRef.current ?? posterSize;
  const layoutSize = previewSize < dragOrigin ? previewSize : dragOrigin;
  const zoomScale = previewSize > dragOrigin ? previewSize / dragOrigin : 1;

  const handlePosterSizeChange = useCallback(
    (size: number) => {
      if (dragOriginRef.current == null) {
        dragOriginRef.current = posterSize;
      }
      setPreviewSize(size);
    },
    [posterSize],
  );

  const handlePosterSizeCommit = useCallback((size: number) => {
    dragOriginRef.current = null;
    setPreviewSize(size);
    setPosterSize(size);
    localStorage.setItem(POSTER_SIZE_STORAGE, String(size));
  }, []);

  const handleSortChange = useCallback(
    (key: MovieSortKey) => {
      if (key === sortKey) {
        setSortDirection((prev) => {
          const next = prev === "asc" ? "desc" : "asc";
          localStorage.setItem(SORT_DIR_STORAGE, next);
          return next;
        });
        return;
      }
      setSortKey(key);
      localStorage.setItem(SORT_KEY_STORAGE, key);
      const nextDir: MovieSortDirection =
        key === "tmdbRating" ||
        key === "imdbRating" ||
        key === "tomatoRating" ||
        key === "traktRating" ||
        key === "popularity" ||
        key === "sizeOnDisk" ||
        key === "added"
          ? "desc"
          : "asc";
      setSortDirection(nextDir);
      localStorage.setItem(SORT_DIR_STORAGE, nextDir);
    },
    [sortKey],
  );

  const handleFilterChange = useCallback((key: MovieFilterKey) => {
    setFilterKey(key);
    localStorage.setItem(FILTER_STORAGE, key);
  }, []);

  const jumpToLetter = useCallback((letter: AlphabetKey) => {
    jumperRef.current?.(letter);
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.fetchQuery({
        queryKey: ["movies", instanceId],
        queryFn: () => listMovies(instanceId, { refresh: true }),
        staleTime: 0,
      });
    } finally {
      setRefreshing(false);
    }
  }, [instanceId, queryClient]);

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <Group justify="space-between" align="center" gap="md" wrap="wrap">
          <TextInput
            placeholder="Filter movies…"
            leftSection={<MagnifyingGlassIcon />}
            value={query}
            onChange={(e) => {
              const next = e.currentTarget.value;
              setQuery(next);
            }}
            maw={360}
            style={{ flex: 1, minWidth: 220 }}
          />

          <MoviesToolbar
            posterSize={previewSize}
            sortKey={sortKey}
            sortDirection={sortDirection}
            filterKey={filterKey}
            onPosterSizeChange={handlePosterSizeChange}
            onPosterSizeCommit={handlePosterSizeCommit}
            onSortChange={handleSortChange}
            onFilterChange={handleFilterChange}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        </Group>
      </div>

      {error && (
        <Alert color="red" title="Failed to load movies">
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      )}

      {showSkeleton && (
        <div className={classes.body}>
          <div className={classes.grid} style={skeletonStyle}>
            {Array.from({ length: 16 }).map((_, i) => (
              <Skeleton key={i} style={{ aspectRatio: "2 / 3" }} radius="md" />
            ))}
          </div>
        </div>
      )}

      {!showSkeleton && movies.length === 0 && !error && (
        <Text c="dimmed">
          {query || filterKey !== "all"
            ? "No movies match your current sort/filter."
            : "No movies found. Add a Radarr client in Settings, or add movies in Radarr."}
        </Text>
      )}

      {!showSkeleton && movies.length > 0 && (
        <div className={classes.body}>
          <VirtualizedMovieGrid
            movies={movies}
            posterSize={layoutSize}
            zoomScale={zoomScale}
            activeLetter={activeLetter}
            onActiveLetterChange={setActiveLetter}
            onEditMovie={setEditingMovie}
            jumperRef={jumperRef}
          />
          <AlphabetJumper
            available={availableLetters}
            active={activeLetter}
            onJump={jumpToLetter}
          />
        </div>
      )}

      {editingMovie && (
        <MovieEditModal
          opened
          instanceId={editingMovie.instanceId}
          movieId={editingMovie.externalId}
          title={editingMovie.title}
          onClose={() => setEditingMovie(null)}
        />
      )}
    </div>
  );
}
