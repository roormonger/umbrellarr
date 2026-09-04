import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Checkbox,
  Group,
  ScrollArea,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { UserIcon } from "@phosphor-icons/react/dist/csr/User";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ArrKind, WantedListItem, WantedMode } from "@umbrellarr/shared";
import { useMemo, useState } from "react";
import { listInstances } from "@/api/instances";
import {
  listUnifiedWanted,
  monitorWanted,
  searchWantedAll,
  searchWantedInstance,
  unmonitorWanted,
} from "@/api/wanted";
import { ArtistInteractiveSearchModal } from "@/components/artists/ArtistInteractiveSearchModal";
import { MovieInteractiveSearchModal } from "@/components/movies/MovieInteractiveSearchModal";
import { ShowInteractiveSearchModal } from "@/components/shows/ShowInteractiveSearchModal";
import {
  WantedPager,
  WantedToolbar,
  type WantedPageSize,
} from "@/components/wanted/WantedToolbar";
import { usePageHeader } from "@/layout/pageHeader";
import { ACTIVITY_LIST_STALE_MS, focusAwareRefetchInterval } from "@/lib/queryFocus";
import {
  formatWantedDate,
  groupWantedIdsByInstance,
  instanceNameFor,
  kindLabel,
  wantedDateValue,
  wantedDetailPath,
  wantedEmptyMessage,
  wantedItemKey,
  wantedRowPrimary,
  wantedRowSecondary,
} from "@/lib/wantedDisplay";
import classes from "./WantedPage.module.css";

const POLL_MS = 60_000;

function parseMode(raw: string | null): WantedMode {
  return raw === "cutoff" ? "cutoff" : "missing";
}

function WantedStatusCell({ item, mode }: { item: WantedListItem; mode: WantedMode }) {
  if (mode === "cutoff" && item.quality) {
    return (
      <Badge size="sm" variant="light" className={classes.quality}>
        {item.quality}
      </Badge>
    );
  }
  if (item.kind === "radarr" && item.isAvailable === false) {
    return (
      <Tooltip label="Unaired / unavailable">
        <ClockIcon size={18} />
      </Tooltip>
    );
  }
  return (
    <Tooltip label="Missing">
      <WarningCircleIcon size={18} color="var(--mantine-color-orange-6)" />
    </Tooltip>
  );
}

export function WantedPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.search });
  const params = new URLSearchParams(searchStr);
  const instanceFilter = params.get("instance") ?? undefined;
  const mode = parseMode(params.get("mode"));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<WantedPageSize>(50);
  const [monitored, setMonitored] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [interactiveItem, setInteractiveItem] = useState<WantedListItem | null>(null);

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  const arrInstances = useMemo(
    () =>
      (instancesQuery.data?.instances ?? []).filter(
        (instance) =>
          instance.kind === "radarr" || instance.kind === "sonarr" || instance.kind === "lidarr",
      ),
    [instancesQuery.data?.instances],
  );

  const instanceOptions = useMemo(
    () => [
      { value: "all", label: "All instances" },
      ...arrInstances.map((instance) => ({
        value: instance.id,
        label: `${instance.name} (${kindLabel(instance.kind as ArrKind)})`,
      })),
    ],
    [arrInstances],
  );

  const activeInstanceFilter =
    instanceFilter && arrInstances.some((instance) => instance.id === instanceFilter)
      ? instanceFilter
      : undefined;

  const listQuery = useQuery({
    queryKey: ["wanted", "unified", mode, page, activeInstanceFilter, pageSize, monitored],
    queryFn: () =>
      listUnifiedWanted({
        mode,
        page,
        pageSize,
        instanceId: activeInstanceFilter,
        monitored,
      }),
    enabled: arrInstances.length > 0,
    staleTime: ACTIVITY_LIST_STALE_MS,
    refetchInterval: focusAwareRefetchInterval(POLL_MS),
    refetchIntervalInBackground: false,
  });

  const items = listQuery.data?.items ?? [];
  const totalRecords = listQuery.data?.totalRecords ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const fetchErrors = listQuery.data?.errors ?? [];

  const selectedItems = useMemo(() => {
    const keySet = new Set(selectedKeys);
    return items.filter((item) => keySet.has(wantedItemKey(item)));
  }, [items, selectedKeys]);

  const headerCount = useMemo(() => {
    if (listQuery.data == null) return listQuery.isFetching ? "Loading…" : null;
    return totalRecords.toLocaleString();
  }, [listQuery.data, listQuery.isFetching, totalRecords]);

  usePageHeader("Wanted", headerCount);

  const invalidateWanted = () => queryClient.invalidateQueries({ queryKey: ["wanted"] });

  function navigateWanted(next: { instance?: string; mode?: WantedMode }) {
    setPage(1);
    setSelectedKeys([]);
    void navigate({
      to: "/activity/wanted",
      search: {
        instance: next.instance === "all" ? undefined : (next.instance ?? activeInstanceFilter),
        mode: next.mode ?? mode,
      },
    });
  }

  const searchMutation = useMutation({
    mutationFn: async (payload: { selected: WantedListItem[] } | { all: true }) => {
      if ("all" in payload) {
        return searchWantedAll({ mode, instanceId: activeInstanceFilter });
      }
      const groups = groupWantedIdsByInstance(payload.selected);
      for (const group of groups) {
        await searchWantedInstance(group.instanceId, { mode, ids: group.ids });
      }
      return { ok: true as const, errors: [] };
    },
    onSuccess: async (result) => {
      const errors = "errors" in result ? result.errors : [];
      if (errors.length > 0) {
        notifications.show({
          color: "orange",
          message: `Search started with ${errors.length} instance error(s)`,
        });
      } else {
        notifications.show({ color: "green", message: "Search queued" });
      }
      await invalidateWanted();
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Search failed",
      });
    },
  });

  const toggleMonitorMutation = useMutation({
    mutationFn: async (selected: WantedListItem[]) => {
      const items = groupWantedIdsByInstance(selected);
      if (monitored) {
        await unmonitorWanted({ items });
      } else {
        await monitorWanted({ items });
      }
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        message: monitored ? "Selected items unmonitored" : "Selected items monitored",
      });
      setSelectedKeys([]);
      await invalidateWanted();
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        message:
          error instanceof Error
            ? error.message
            : monitored
              ? "Unmonitor failed"
              : "Monitor failed",
      });
    },
  });

  const allVisibleSelected =
    items.length > 0 && items.every((item) => selectedKeys.includes(wantedItemKey(item)));

  function toggleAllVisible() {
    if (allVisibleSelected) {
      const visible = new Set(items.map(wantedItemKey));
      setSelectedKeys((prev) => prev.filter((key) => !visible.has(key)));
      return;
    }
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const item of items) next.add(wantedItemKey(item));
      return [...next];
    });
  }

  function toggleOne(item: WantedListItem) {
    const key = wantedItemKey(item);
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const loading = listQuery.isLoading || instancesQuery.isLoading;
  const error = listQuery.error ?? instancesQuery.error;

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <WantedToolbar
          mode={mode}
          instanceFilter={activeInstanceFilter ?? "all"}
          instanceOptions={instanceOptions}
          pageSize={pageSize}
          monitored={monitored}
          selectedCount={selectedItems.length}
          refreshing={listQuery.isFetching}
          searching={searchMutation.isPending}
          togglingMonitor={toggleMonitorMutation.isPending}
          onModeChange={(next) => navigateWanted({ mode: next })}
          onInstanceFilterChange={(value) => navigateWanted({ instance: value })}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
            setSelectedKeys([]);
          }}
          onMonitoredChange={(next) => {
            setMonitored(next);
            setPage(1);
            setSelectedKeys([]);
          }}
          onRefresh={() => void invalidateWanted()}
          onSearchAll={() => searchMutation.mutate({ all: true })}
          onToggleMonitorSelected={() => toggleMonitorMutation.mutate(selectedItems)}
        />
      </div>

      {error ? (
        <Alert color="red" title="Could not load wanted">
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      ) : null}

      {fetchErrors.length > 0 ? (
        <Alert color="orange" title="Some instances could not be loaded">
          <Stack gap={4}>
            {fetchErrors.map((entry) => (
              <Text key={entry.instanceId} size="sm">
                {entry.instanceName}: {entry.message}
              </Text>
            ))}
          </Stack>
        </Alert>
      ) : null}

      <div className={classes.body}>
        <div className={classes.tableWrap}>
          <div className={classes.tableScroll}>
            {loading ? (
              <Skeleton height="100%" radius={0} />
            ) : (
              <ScrollArea h="100%" offsetScrollbars type="auto">
              <Table striped highlightOnHover stickyHeader horizontalSpacing="sm" verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}>
                      <Checkbox
                        aria-label="Select all visible"
                        checked={allVisibleSelected}
                        indeterminate={selectedItems.length > 0 && !allVisibleSelected}
                        onChange={toggleAllVisible}
                      />
                    </Table.Th>
                    <Table.Th>Title</Table.Th>
                    <Table.Th>Details</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Instance</Table.Th>
                    <Table.Th w={88}> </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Text c="dimmed" size="sm" ta="center" py="xl">
                          {wantedEmptyMessage(mode)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    items.map((item) => {
                      const key = wantedItemKey(item);
                      const detailPath = wantedDetailPath(item);
                      const secondary = wantedRowSecondary(item);
                      return (
                        <Table.Tr key={key}>
                          <Table.Td>
                            <Checkbox
                              aria-label={`Select ${wantedRowPrimary(item)}`}
                              checked={selectedKeys.includes(key)}
                              onChange={() => toggleOne(item)}
                            />
                          </Table.Td>
                          <Table.Td>
                            {detailPath ? (
                              <Anchor
                                component={Link}
                                to={detailPath}
                                size="sm"
                                className={classes.title}
                              >
                                {wantedRowPrimary(item)}
                              </Anchor>
                            ) : (
                              <Text size="sm" className={classes.title} lineClamp={2}>
                                {wantedRowPrimary(item)}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {item.kind === "radarr" ? (
                              <Text size="sm">{item.year ?? "—"}</Text>
                            ) : secondary ? (
                              <Text size="sm" lineClamp={2}>
                                {secondary}
                              </Text>
                            ) : (
                              "—"
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                              {formatWantedDate(wantedDateValue(item))}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <WantedStatusCell item={item} mode={mode} />
                          </Table.Td>
                          <Table.Td>
                            <Group gap={6} wrap="nowrap">
                              <Text size="sm" lineClamp={1}>
                                {instanceNameFor(arrInstances, item.instanceId)}
                              </Text>
                              <Badge size="xs" variant="light">
                                {kindLabel(item.kind)}
                              </Badge>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={4} justify="flex-end" className={classes.actions} wrap="nowrap">
                              <Tooltip label="Automatic Search">
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  aria-label="Automatic search"
                                  loading={searchMutation.isPending}
                                  onClick={() => searchMutation.mutate({ selected: [item] })}
                                >
                                  <MagnifyingGlassIcon size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Interactive Search">
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  aria-label="Interactive search"
                                  onClick={() => setInteractiveItem(item)}
                                >
                                  <UserIcon size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
              </ScrollArea>
            )}
          </div>
          <div className={classes.pager}>
            <WantedPager
              page={page}
              totalPages={totalPages}
              onPageChange={(next) => {
                setPage(next);
                setSelectedKeys([]);
              }}
            />
          </div>
        </div>
      </div>

      {interactiveItem?.kind === "radarr" && interactiveItem.movieId != null ? (
        <MovieInteractiveSearchModal
          opened
          onClose={() => setInteractiveItem(null)}
          instanceId={interactiveItem.instanceId}
          movieId={interactiveItem.movieId}
          title={interactiveItem.title}
          year={interactiveItem.year}
        />
      ) : null}

      {interactiveItem?.kind === "sonarr" &&
      interactiveItem.seriesId != null &&
      interactiveItem.episodeId != null ? (
        <ShowInteractiveSearchModal
          opened
          onClose={() => setInteractiveItem(null)}
          instanceId={interactiveItem.instanceId}
          seriesId={interactiveItem.seriesId}
          title={interactiveItem.seriesTitle ?? interactiveItem.title}
          episodeId={interactiveItem.episodeId}
          episodeNumber={interactiveItem.episodeNumber}
          episodeTitle={interactiveItem.episodeTitle}
          seasonNumber={interactiveItem.seasonNumber}
        />
      ) : null}

      {interactiveItem?.kind === "lidarr" && interactiveItem.artistId != null ? (
        <ArtistInteractiveSearchModal
          opened
          onClose={() => setInteractiveItem(null)}
          instanceId={interactiveItem.instanceId}
          artistId={interactiveItem.artistId}
          title={
            interactiveItem.albumTitle
              ? `${interactiveItem.artistName ?? interactiveItem.title} — ${interactiveItem.albumTitle}`
              : (interactiveItem.artistName ?? interactiveItem.title)
          }
          albumId={interactiveItem.albumId}
        />
      ) : null}
    </div>
  );
}
