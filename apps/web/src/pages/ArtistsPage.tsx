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
  ArtistFilterKeySchema,
  ArtistSortDirectionSchema,
  ArtistSortKeySchema,
  type ArtistFilterKey,
  type ArtistListItem,
  type ArtistSortDirection,
  type ArtistSortKey,
} from "@umbrellarr/shared";
import { useCallback, useMemo, useRef, useState } from "react";
import { listArtists } from "@/api/artists";
import { listInstances } from "@/api/instances";
import { AlphabetJumper } from "@/components/media/AlphabetJumper";
import { ArtistEditModal } from "@/components/artists/ArtistEditModal";
import {
  POSTER_SIZE_DEFAULT,
  POSTER_SIZE_MAX,
  POSTER_SIZE_MIN,
  ArtistsToolbar,
} from "@/components/artists/ArtistsToolbar";
import { VirtualizedArtistGrid } from "@/components/artists/VirtualizedArtistGrid";
import { usePageHeader } from "@/layout/pageHeader";
import { letterKey, type AlphabetKey } from "@/lib/alphabet";
import { applyArtistQuery, filterArtists, sortArtists } from "@/lib/artistSortFilter";
import { getPosterScale } from "@/lib/posterScale";
import classes from "./ArtistsPage.module.css";

const SORT_KEY_STORAGE = "umbrellarr.artists.sortKey";
const SORT_DIR_STORAGE = "umbrellarr.artists.sortDirection";
const FILTER_STORAGE = "umbrellarr.artists.filterKey";
const POSTER_SIZE_STORAGE = "umbrellarr.artists.posterSize";

function readStoredSortKey(): ArtistSortKey {
  const raw = localStorage.getItem(SORT_KEY_STORAGE);
  const parsed = ArtistSortKeySchema.safeParse(raw);
  return parsed.success ? parsed.data : "title";
}

function readStoredSortDirection(): ArtistSortDirection {
  const raw = localStorage.getItem(SORT_DIR_STORAGE);
  const parsed = ArtistSortDirectionSchema.safeParse(raw);
  return parsed.success ? parsed.data : "asc";
}

function readStoredFilter(): ArtistFilterKey {
  const raw = localStorage.getItem(FILTER_STORAGE);
  const parsed = ArtistFilterKeySchema.safeParse(raw);
  return parsed.success ? parsed.data : "all";
}

function readStoredPosterSize(): number {
  const raw = Number(localStorage.getItem(POSTER_SIZE_STORAGE));
  if (!Number.isFinite(raw)) return POSTER_SIZE_DEFAULT;
  return Math.min(POSTER_SIZE_MAX, Math.max(POSTER_SIZE_MIN, raw));
}

export function ArtistsPage() {
  const queryClient = useQueryClient();
  const { instanceId } = useParams({ from: "/app/music/$instanceId" });
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<ArtistSortKey>(readStoredSortKey);
  const [sortDirection, setSortDirection] = useState<ArtistSortDirection>(readStoredSortDirection);
  const [filterKey, setFilterKey] = useState<ArtistFilterKey>(readStoredFilter);
  const [posterSize, setPosterSize] = useState(readStoredPosterSize);
  const [previewSize, setPreviewSize] = useState(readStoredPosterSize);
  const [activeLetter, setActiveLetter] = useState<string>("#");
  const [editingArtist, setEditingArtist] = useState<ArtistListItem | null>(null);
  const jumperRef = useRef<((letter: AlphabetKey) => void) | null>(null);
  const dragOriginRef = useRef<number | null>(null);

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  const instanceName =
    instancesQuery.data?.instances.find((i) => i.id === instanceId)?.name ?? "Music";

  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ["artists", instanceId],
    queryFn: () => listArtists(instanceId),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: "always",
  });

  const showSkeleton = isPending && !data;

  const artists = useMemo(() => {
    const items = data?.artists ?? [];
    const filtered = filterArtists(items, filterKey);
    const searched = applyArtistQuery(filtered, query);
    return sortArtists(searched, sortKey, sortDirection);
  }, [data?.artists, filterKey, query, sortKey, sortDirection]);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const item of artists) {
      set.add(letterKey(item.sortTitle ?? item.title));
    }
    return set;
  }, [artists]);

  const headerCount = useMemo(() => {
    if (data?.artists.length == null) return showSkeleton || isFetching ? "Loading…" : null;
    const total = data.artists.length;
    const shown = artists.length;
    const totalLabel = total.toLocaleString();
    if (shown !== total) return `${shown.toLocaleString()} of ${totalLabel}`;
    return totalLabel;
  }, [data?.artists.length, artists.length, showSkeleton, isFetching]);

  usePageHeader(instanceName, headerCount);

  const skeletonStyle = useMemo(() => getPosterScale(previewSize, 1).style, [previewSize]);

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
    (key: ArtistSortKey) => {
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
      const nextDir: ArtistSortDirection =
        key === "sizeOnDisk" || key === "added" || key === "trackProgress" || key === "albumCount"
          ? "desc"
          : "asc";
      setSortDirection(nextDir);
      localStorage.setItem(SORT_DIR_STORAGE, nextDir);
    },
    [sortKey],
  );

  const handleFilterChange = useCallback((key: ArtistFilterKey) => {
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
        queryKey: ["artists", instanceId],
        queryFn: () => listArtists(instanceId, { refresh: true }),
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
            placeholder="Filter artists…"
            leftSection={<MagnifyingGlassIcon />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            maw={360}
            style={{ flex: 1, minWidth: 220 }}
          />

          <ArtistsToolbar
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
        <Alert color="red" title="Failed to load artists">
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      )}

      {showSkeleton && (
        <div className={classes.body}>
          <div className={classes.grid} style={skeletonStyle}>
            {Array.from({ length: 16 }).map((_, i) => (
              <Skeleton key={i} style={{ aspectRatio: "1 / 1" }} radius="md" />
            ))}
          </div>
        </div>
      )}

      {!showSkeleton && artists.length === 0 && !error && (
        <Text c="dimmed">
          {query || filterKey !== "all"
            ? "No artists match your current sort/filter."
            : "No artists found. Add a Lidarr client in Settings, or add artists in Lidarr."}
        </Text>
      )}

      {!showSkeleton && artists.length > 0 && (
        <div className={classes.body}>
          <VirtualizedArtistGrid
            artists={artists}
            posterSize={layoutSize}
            zoomScale={zoomScale}
            activeLetter={activeLetter}
            onActiveLetterChange={setActiveLetter}
            onEditArtist={setEditingArtist}
            jumperRef={jumperRef}
          />
          <AlphabetJumper
            available={availableLetters}
            active={activeLetter}
            onJump={jumpToLetter}
          />
        </div>
      )}

      {editingArtist && (
        <ArtistEditModal
          opened
          instanceId={editingArtist.instanceId}
          artistId={editingArtist.externalId}
          title={editingArtist.title}
          onClose={() => setEditingArtist(null)}
        />
      )}
    </div>
  );
}
