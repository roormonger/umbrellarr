import {
  Alert,
  Button,
  Group,
  Skeleton,
  Text,
  TextInput,
} from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { useParams } from "@tanstack/react-router";
import {
  SeriesFilterKeySchema,
  SeriesSortDirectionSchema,
  SeriesSortKeySchema,
  type SeriesFilterKey,
  type SeriesListItem,
  type SeriesSortDirection,
  type SeriesSortKey,
} from "@umbrellarr/shared";
import { useCallback, useMemo, useRef, useState } from "react";
import { listInstances } from "@/api/instances";
import {
  fetchShowsFull,
  fetchShowsHead,
  showsFullQueryKey,
  showsHeadQueryKey,
} from "@/api/libraryList";
import { AlphabetJumper } from "@/components/media/AlphabetJumper";
import { ShowAddSearchModal } from "@/components/shows/ShowAddSearchModal";
import { ShowEditModal } from "@/components/shows/ShowEditModal";
import {
  POSTER_SIZE_DEFAULT,
  POSTER_SIZE_MAX,
  POSTER_SIZE_MIN,
  ShowsToolbar,
} from "@/components/shows/ShowsToolbar";
import { VirtualizedShowGrid } from "@/components/shows/VirtualizedShowGrid";
import { usePageHeader } from "@/layout/pageHeader";
import { useProgressiveLibrary } from "@/lib/useProgressiveLibrary";
import { letterKey, type AlphabetKey } from "@/lib/alphabet";
import { getPosterScale } from "@/lib/posterScale";
import { applySeriesQuery, filterSeries, sortSeries } from "@/lib/showSortFilter";
import classes from "./ShowsPage.module.css";

const SORT_KEY_STORAGE = "umbrellarr.shows.sortKey";
const SORT_DIR_STORAGE = "umbrellarr.shows.sortDirection";
const FILTER_STORAGE = "umbrellarr.shows.filterKey";
const POSTER_SIZE_STORAGE = "umbrellarr.shows.posterSize";

function readStoredSortKey(): SeriesSortKey {
  const raw = localStorage.getItem(SORT_KEY_STORAGE);
  const parsed = SeriesSortKeySchema.safeParse(raw);
  return parsed.success ? parsed.data : "title";
}

function readStoredSortDirection(): SeriesSortDirection {
  const raw = localStorage.getItem(SORT_DIR_STORAGE);
  const parsed = SeriesSortDirectionSchema.safeParse(raw);
  return parsed.success ? parsed.data : "asc";
}

function readStoredFilter(): SeriesFilterKey {
  const raw = localStorage.getItem(FILTER_STORAGE);
  const parsed = SeriesFilterKeySchema.safeParse(raw);
  return parsed.success ? parsed.data : "all";
}

function readStoredPosterSize(): number {
  const raw = Number(localStorage.getItem(POSTER_SIZE_STORAGE));
  if (!Number.isFinite(raw)) return POSTER_SIZE_DEFAULT;
  return Math.min(POSTER_SIZE_MAX, Math.max(POSTER_SIZE_MIN, raw));
}

export function ShowsPage() {
  const queryClient = useQueryClient();
  const { instanceId } = useParams({ from: "/app/shows/$instanceId" });
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SeriesSortKey>(readStoredSortKey);
  const [sortDirection, setSortDirection] = useState<SeriesSortDirection>(readStoredSortDirection);
  const [filterKey, setFilterKey] = useState<SeriesFilterKey>(readStoredFilter);
  const [posterSize, setPosterSize] = useState(readStoredPosterSize);
  const [previewSize, setPreviewSize] = useState(readStoredPosterSize);
  const [activeLetter, setActiveLetter] = useState<string>("#");
  const [editingSeries, setEditingSeries] = useState<SeriesListItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const jumperRef = useRef<((letter: AlphabetKey) => void) | null>(null);
  const dragOriginRef = useRef<number | null>(null);

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  const instanceName =
    instancesQuery.data?.instances.find((i) => i.id === instanceId)?.name ?? "Shows";

  const { data, showingHead, showSkeleton, error, isFetching, refresh } = useProgressiveLibrary({
    instanceId,
    fullQueryKey: showsFullQueryKey(instanceId),
    headQueryKey: showsHeadQueryKey(instanceId),
    fetchHead: () => fetchShowsHead(instanceId),
    fetchFull: () => fetchShowsFull(queryClient, instanceId),
    fetchRefresh: () => fetchShowsFull(queryClient, instanceId, { refresh: true }),
  });

  const series = useMemo(() => {
    const items = data?.series ?? [];
    const filtered = filterSeries(items, filterKey);
    const searched = applySeriesQuery(filtered, query);
    return sortSeries(searched, sortKey, sortDirection);
  }, [data?.series, filterKey, query, sortKey, sortDirection]);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const item of series) {
      set.add(letterKey(item.sortTitle ?? item.title));
    }
    return set;
  }, [series]);

  const headerCount = useMemo(() => {
    if (data?.series == null) return showSkeleton || isFetching ? "Loading…" : null;
    const libraryTotal = data.total ?? data.series.length;
    const shown = series.length;
    const totalLabel = libraryTotal.toLocaleString();
    if (showingHead && data.truncated && !query && filterKey === "all") {
      return totalLabel;
    }
    if (shown !== libraryTotal) return `${shown.toLocaleString()} of ${totalLabel}`;
    return totalLabel;
  }, [data, series.length, showSkeleton, isFetching, showingHead, query, filterKey]);

  usePageHeader(instanceName, headerCount);

  const skeletonStyle = useMemo(() => getPosterScale(previewSize).style, [previewSize]);

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
    (key: SeriesSortKey) => {
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
      const nextDir: SeriesSortDirection =
        key === "tmdbRating" ||
        key === "imdbRating" ||
        key === "traktRating" ||
        key === "sizeOnDisk" ||
        key === "added" ||
        key === "episodeProgress"
          ? "desc"
          : "asc";
      setSortDirection(nextDir);
      localStorage.setItem(SORT_DIR_STORAGE, nextDir);
    },
    [sortKey],
  );

  const handleFilterChange = useCallback((key: SeriesFilterKey) => {
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
          <Group gap="sm" wrap="nowrap" align="center" style={{ flex: 1, minWidth: 220 }}>
            <TextInput
              placeholder="Filter shows…"
              leftSection={<MagnifyingGlassIcon />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
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

          <ShowsToolbar
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
        <Alert color="red" title="Failed to load shows">
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

      {!showSkeleton && series.length === 0 && !error && (
        <Text c="dimmed">
          {query || filterKey !== "all"
            ? "No shows match your current sort/filter."
            : "No shows found. Add a Sonarr client in Settings, or add series in Sonarr."}
        </Text>
      )}

      {!showSkeleton && series.length > 0 && (
        <div className={classes.body}>
          <VirtualizedShowGrid
            series={series}
            posterSize={layoutSize}
            zoomScale={zoomScale}
            activeLetter={activeLetter}
            onActiveLetterChange={setActiveLetter}
            onEditSeries={setEditingSeries}
            jumperRef={jumperRef}
          />
          <AlphabetJumper
            available={availableLetters}
            active={activeLetter}
            onJump={jumpToLetter}
          />
        </div>
      )}

      {addOpen && (
        <ShowAddSearchModal
          opened
          instanceId={instanceId}
          onClose={() => setAddOpen(false)}
        />
      )}

      {editingSeries && (
        <ShowEditModal
          opened
          instanceId={editingSeries.instanceId}
          seriesId={editingSeries.externalId}
          title={editingSeries.title}
          onClose={() => setEditingSeries(null)}
        />
      )}
    </div>
  );
}
