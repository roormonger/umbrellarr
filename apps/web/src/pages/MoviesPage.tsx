import {
  Alert,
  Button,
  Group,
  Select,
  Skeleton,
  Text,
  TextInput,
} from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { useNavigate, useRouterState } from "@tanstack/react-router";
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
import {
  fetchMoviesFull,
  fetchMoviesHead,
  moviesFullQueryKey,
  moviesHeadQueryKey,
} from "@/api/libraryList";
import { AlphabetJumper } from "@/components/media/AlphabetJumper";
import { MovieAddSearchModal } from "@/components/movies/MovieAddSearchModal";
import { MovieEditModal } from "@/components/movies/MovieEditModal";
import {
  MoviesToolbar,
  POSTER_SIZE_DEFAULT,
  POSTER_SIZE_MAX,
  POSTER_SIZE_MIN,
} from "@/components/movies/MoviesToolbar";
import { VirtualizedMovieGrid } from "@/components/movies/VirtualizedMovieGrid";
import { usePageHeader } from "@/layout/pageHeader";
import { useProgressiveLibrary } from "@/lib/useProgressiveLibrary";
import { letterKey, type AlphabetKey } from "@/lib/alphabet";
import {
  applyMovieQuery,
  filterMovies,
  sortMovies,
} from "@/lib/movieSortFilter";
import { groupMovies, instanceNameMap } from "@/lib/libraryDedup";
import { pickInstanceId } from "@/lib/lastInstance";
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
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.search });
  const instanceFilter = new URLSearchParams(searchStr).get("instance") ?? undefined;
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<MovieSortKey>(readStoredSortKey);
  const [sortDirection, setSortDirection] = useState<MovieSortDirection>(readStoredSortDirection);
  const [filterKey, setFilterKey] = useState<MovieFilterKey>(readStoredFilter);
  const [posterSize, setPosterSize] = useState(readStoredPosterSize);
  const [previewSize, setPreviewSize] = useState(readStoredPosterSize);
  const [activeLetter, setActiveLetter] = useState<string>("#");
  const [editingMovie, setEditingMovie] = useState<MovieListItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const jumperRef = useRef<((letter: AlphabetKey) => void) | null>(null);
  /** Size when the current slider drag began — mode (scale vs live layout) is relative to this. */
  const dragOriginRef = useRef<number | null>(null);

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  const instances = instancesQuery.data?.instances ?? [];
  const radarrInstances = useMemo(
    () => instances.filter((instance) => instance.kind === "radarr"),
    [instances],
  );
  const instanceNames = useMemo(() => instanceNameMap(instances), [instances]);

  const instanceOptions = useMemo(
    () => [
      { value: "all", label: "All instances" },
      ...radarrInstances.map((instance) => ({
        value: instance.id,
        label: instance.name,
      })),
    ],
    [radarrInstances],
  );

  const activeInstanceFilter =
    instanceFilter && radarrInstances.some((instance) => instance.id === instanceFilter)
      ? instanceFilter
      : undefined;

  const addInstanceId =
    activeInstanceFilter ?? pickInstanceId("radarr", instances) ?? radarrInstances[0]?.id ?? "";

  const { data, showingHead, showSkeleton, error, isFetching, refresh } = useProgressiveLibrary({
    instanceId: activeInstanceFilter,
    fullQueryKey: moviesFullQueryKey(activeInstanceFilter),
    headQueryKey: moviesHeadQueryKey(activeInstanceFilter),
    fetchHead: () => fetchMoviesHead(activeInstanceFilter),
    fetchFull: () => fetchMoviesFull(queryClient, activeInstanceFilter),
    fetchRefresh: () => fetchMoviesFull(queryClient, activeInstanceFilter, { refresh: true }),
    enabled: radarrInstances.length > 0,
  });

  const movieGroups = useMemo(() => {
    const items = data?.movies ?? [];
    const filtered = filterMovies(items, filterKey);
    const searched = applyMovieQuery(filtered, query);
    const sorted = sortMovies(searched, sortKey, sortDirection);
    return groupMovies(sorted, instances, instanceNames);
  }, [data?.movies, filterKey, query, sortKey, sortDirection, instances, instanceNames]);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const group of movieGroups) {
      const movie = group.primary;
      set.add(letterKey(movie.sortTitle ?? movie.title));
    }
    return set;
  }, [movieGroups]);

  const headerCount = useMemo(() => {
    if (data?.movies == null) return showSkeleton || isFetching ? "Loading…" : null;
    const libraryTotal = data.total ?? data.movies.length;
    const shown = movieGroups.length;
    const totalLabel = libraryTotal.toLocaleString();
    if (showingHead && data.truncated && !query && filterKey === "all") {
      return totalLabel;
    }
    if (shown !== libraryTotal) return `${shown.toLocaleString()} of ${totalLabel}`;
    return totalLabel;
  }, [data, movieGroups.length, showSkeleton, isFetching, showingHead, query, filterKey]);

  usePageHeader("Movies", headerCount);

  function setInstanceFilter(value: string) {
    void navigate({
      to: "/movies",
      search: { instance: value === "all" ? undefined : value },
    });
  }

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
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <Group justify="space-between" align="center" gap="md" wrap="wrap">
          <Select
            size="sm"
            w={200}
            allowDeselect={false}
            aria-label="Instance filter"
            data={instanceOptions}
            value={activeInstanceFilter ?? "all"}
            onChange={(value) => setInstanceFilter(value ?? "all")}
          />
          <Group gap="sm" wrap="nowrap" align="center" style={{ flex: 1, minWidth: 220 }}>
            <TextInput
              placeholder="Filter movies…"
              leftSection={<MagnifyingGlassIcon />}
              value={query}
              onChange={(e) => {
                const next = e.currentTarget.value;
                setQuery(next);
              }}
              maw={360}
              style={{ flex: 1, minWidth: 180 }}
            />
            <Button
              size="sm"
              leftSection={<PlusIcon size={16} weight="bold" />}
              onClick={() => setAddOpen(true)}
            >
              Add New
            </Button>
          </Group>

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

      {!showSkeleton && movieGroups.length === 0 && !error && (
        <Text c="dimmed">
          {query || filterKey !== "all"
            ? "No movies match your current sort/filter."
            : "No movies found. Add a Radarr client in Settings, or add movies in Radarr."}
        </Text>
      )}

      {!showSkeleton && movieGroups.length > 0 && (
        <div className={classes.body}>
          <VirtualizedMovieGrid
            groups={movieGroups}
            instanceNames={instanceNames}
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

      {addOpen && addInstanceId ? (
        <MovieAddSearchModal
          opened
          instanceId={addInstanceId}
          onClose={() => setAddOpen(false)}
        />
      ) : null}

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
