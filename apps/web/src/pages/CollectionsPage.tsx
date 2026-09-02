import { Alert, Group, Skeleton, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import {
  CollectionFilterKeySchema,
  CollectionSortDirectionSchema,
  CollectionSortKeySchema,
  type CollectionBulkUpdateRequest,
  type CollectionFilterKey,
  type CollectionSortDirection,
  type CollectionSortKey,
} from "@umbrellarr/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  bulkUpdateCollections,
  getCollectionEditOptions,
  listCollections,
  refreshCollections,
} from "@/api/collections";
import { InstanceSelect } from "@/components/media/InstanceSelect";
import { CollectionsBulkBar } from "@/components/collections/CollectionsBulkBar";
import { CollectionsToolbar } from "@/components/collections/CollectionsToolbar";
import { VirtualizedCollectionList } from "@/components/collections/VirtualizedCollectionList";
import { AlphabetJumper } from "@/components/media/AlphabetJumper";
import { usePageHeader } from "@/layout/pageHeader";
import { letterKey, type AlphabetKey } from "@/lib/alphabet";
import {
  applyCollectionQuery,
  filterCollections,
  sortCollections,
} from "@/lib/collectionSortFilter";
import classes from "./CollectionsPage.module.css";

const SORT_KEY_STORAGE = "umbrellarr.collections.sortKey";
const SORT_DIR_STORAGE = "umbrellarr.collections.sortDirection";
const FILTER_STORAGE = "umbrellarr.collections.filterKey";

function readStoredSortKey(): CollectionSortKey {
  const parsed = CollectionSortKeySchema.safeParse(localStorage.getItem(SORT_KEY_STORAGE));
  return parsed.success ? parsed.data : "title";
}

function readStoredSortDirection(): CollectionSortDirection {
  const parsed = CollectionSortDirectionSchema.safeParse(localStorage.getItem(SORT_DIR_STORAGE));
  return parsed.success ? parsed.data : "asc";
}

function readStoredFilter(): CollectionFilterKey {
  const parsed = CollectionFilterKeySchema.safeParse(localStorage.getItem(FILTER_STORAGE));
  return parsed.success ? parsed.data : "all";
}

export function CollectionsPage() {
  const queryClient = useQueryClient();
  const { instanceId } = useParams({ from: "/app/movies/$instanceId/collections" });
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<CollectionSortKey>(readStoredSortKey);
  const [sortDirection, setSortDirection] = useState<CollectionSortDirection>(readStoredSortDirection);
  const [filterKey, setFilterKey] = useState<CollectionFilterKey>(readStoredFilter);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeLetter, setActiveLetter] = useState<string>("#");
  const jumperRef = useRef<((letter: AlphabetKey) => void) | null>(null);

  const listQuery = useQuery({
    queryKey: ["collections", instanceId],
    queryFn: () => listCollections(instanceId),
  });

  const optionsQuery = useQuery({
    queryKey: ["collection-options", instanceId],
    queryFn: () => getCollectionEditOptions(instanceId),
    staleTime: 5 * 60_000,
  });

  const collections = useMemo(() => {
    const items = listQuery.data?.collections ?? [];
    const filtered = filterCollections(items, filterKey);
    const searched = applyCollectionQuery(filtered, query);
    return sortCollections(searched, sortKey, sortDirection);
  }, [listQuery.data?.collections, filterKey, query, sortKey, sortDirection]);

  const visibleIds = useMemo(() => collections.map((c) => c.externalId), [collections]);
  const selectedVisible = selectedIds.filter((id) => visibleIds.includes(id));
  const allSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const collection of collections) {
      set.add(letterKey(collection.sortTitle));
    }
    return set;
  }, [collections]);

  const headerCount = useMemo(() => {
    if (listQuery.data?.collections == null) {
      return listQuery.isFetching ? "Loading…" : null;
    }
    const total = listQuery.data.count;
    const shown = collections.length;
    if (shown !== total) return `${shown.toLocaleString()} of ${total.toLocaleString()}`;
    return total.toLocaleString();
  }, [listQuery.data, listQuery.isFetching, collections.length]);

  usePageHeader("Collections", headerCount);

  useEffect(() => {
    setSelectedIds([]);
  }, [instanceId]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const handleSortChange = useCallback(
    (key: CollectionSortKey) => {
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
      const nextDir: CollectionSortDirection = key === "missing" ? "desc" : "asc";
      setSortDirection(nextDir);
      localStorage.setItem(SORT_DIR_STORAGE, nextDir);
    },
    [sortKey],
  );

  const handleFilterChange = useCallback((key: CollectionFilterKey) => {
    setFilterKey(key);
    localStorage.setItem(FILTER_STORAGE, key);
  }, []);

  const jumpToLetter = useCallback((letter: AlphabetKey) => {
    jumperRef.current?.(letter);
  }, []);

  const toggleSelected = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((item) => item !== id);
    });
  }, []);

  const refreshMutation = useMutation({
    mutationFn: () => refreshCollections(instanceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["collections", instanceId] });
      notifications.show({ color: "green", message: "Collections refresh queued in Radarr" });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Refresh failed",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Omit<CollectionBulkUpdateRequest, "collectionIds">) =>
      bulkUpdateCollections(instanceId, {
        collectionIds: selectedVisible,
        ...patch,
      }),
    onSuccess: async () => {
      setSelectedIds([]);
      await queryClient.invalidateQueries({ queryKey: ["collections", instanceId] });
      notifications.show({ color: "green", message: "Selected collections updated in Radarr" });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Update failed",
      });
    },
  });

  const showSkeleton = listQuery.isPending && !listQuery.data;

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <Group justify="space-between" align="center" gap="md" wrap="wrap">
          <InstanceSelect
            kind="radarr"
            instanceId={instanceId}
            hrefFor={(id) => `/movies/${id}/collections`}
          />
          <TextInput
            placeholder="Filter collections…"
            leftSection={<MagnifyingGlassIcon />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            maw={360}
            style={{ flex: 1, minWidth: 180 }}
          />
          <CollectionsToolbar
            sortKey={sortKey}
            sortDirection={sortDirection}
            filterKey={filterKey}
            allSelected={allSelected}
            onSortChange={handleSortChange}
            onFilterChange={handleFilterChange}
            onSelectAll={() => setSelectedIds(visibleIds)}
            onClearSelection={() => setSelectedIds([])}
            onRefresh={() => refreshMutation.mutate()}
            refreshing={refreshMutation.isPending}
          />
        </Group>
      </div>

      {listQuery.error && (
        <Alert color="red" title="Failed to load collections">
          {listQuery.error instanceof Error ? listQuery.error.message : "Unknown error"}
        </Alert>
      )}

      {showSkeleton && (
        <div className={classes.body}>
          <div className={classes.list}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={160} radius="md" />
            ))}
          </div>
        </div>
      )}

      {!showSkeleton && collections.length === 0 && !listQuery.error && (
        <Text c="dimmed">
          {query || filterKey !== "all"
            ? "No collections match your current filter."
            : "No collections found. Refresh collections in Radarr, or add movies that belong to a TMDB collection."}
        </Text>
      )}

      {!showSkeleton && collections.length > 0 && (
        <div className={classes.body}>
          <VirtualizedCollectionList
            collections={collections}
            selectedIds={selectedSet}
            onToggle={toggleSelected}
            onActiveLetterChange={setActiveLetter}
            jumperRef={jumperRef}
          />
          <AlphabetJumper
            available={availableLetters}
            active={activeLetter}
            onJump={jumpToLetter}
          />
        </div>
      )}

      <div className={classes.footer}>
        <CollectionsBulkBar
          selectedCount={selectedVisible.length}
          options={optionsQuery.data}
          updating={updateMutation.isPending}
          onUpdate={(patch) => updateMutation.mutate(patch)}
        />
      </div>
    </div>
  );
}
