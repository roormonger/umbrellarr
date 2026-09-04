import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Group,
  ScrollArea,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { HistoryEventType, HistoryListItem, HistoryProtocolFilter } from "@umbrellarr/shared";
import { useMemo, useState } from "react";
import { deleteHistoryItem, listUnifiedHistory } from "@/api/history";
import { listInstances } from "@/api/instances";
import { HistoryDetailsModal } from "@/components/history/HistoryDetailsModal";
import { HistoryStatusCell } from "@/components/history/HistoryStatusCell";
import { HistoryPager, HistoryToolbar, type HistoryPageSize } from "@/components/history/HistoryToolbar";
import { usePageHeader } from "@/layout/pageHeader";
import {
  formatElapsedMs,
  formatHistoryDate,
  formatScore,
  historyCategories,
  historyDetailPath,
  historyItemKey,
  historyRowPrimary,
  historyRowSecondary,
  instanceNameFor,
  kindLabel,
} from "@/lib/historyDisplay";
import { ACTIVITY_LIST_STALE_MS } from "@/lib/queryFocus";
import classes from "./HistoryPage.module.css";

export function HistoryPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.search });
  const instanceFilter = new URLSearchParams(searchStr).get("instance") ?? undefined;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<HistoryPageSize>(50);
  const [eventType, setEventType] = useState<HistoryEventType | "all">("all");
  const [protocol, setProtocol] = useState<HistoryProtocolFilter | "all">("all");
  const [detailsItem, setDetailsItem] = useState<HistoryListItem | null>(null);

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  const historyInstances = useMemo(
    () =>
      (instancesQuery.data?.instances ?? []).filter(
        (instance) =>
          instance.kind === "radarr" ||
          instance.kind === "sonarr" ||
          instance.kind === "lidarr" ||
          instance.kind === "prowlarr",
      ),
    [instancesQuery.data?.instances],
  );

  const instanceOptions = useMemo(
    () => [
      { value: "all", label: "All instances" },
      ...historyInstances.map((instance) => ({
        value: instance.id,
        label: `${instance.name} (${kindLabel(instance.kind as HistoryListItem["kind"])})`,
      })),
    ],
    [historyInstances],
  );

  const activeInstanceFilter =
    instanceFilter && historyInstances.some((instance) => instance.id === instanceFilter)
      ? instanceFilter
      : undefined;

  const listQuery = useQuery({
    queryKey: ["history", "unified", page, activeInstanceFilter, eventType, protocol, pageSize],
    queryFn: () =>
      listUnifiedHistory({
        page,
        pageSize,
        instanceId: activeInstanceFilter,
        eventType,
        protocol,
      }),
    enabled: historyInstances.length > 0,
    staleTime: ACTIVITY_LIST_STALE_MS,
  });

  const items = listQuery.data?.items ?? [];
  const totalRecords = listQuery.data?.totalRecords ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const fetchErrors = listQuery.data?.errors ?? [];

  const headerCount = useMemo(() => {
    if (listQuery.data == null) return listQuery.isFetching ? "Loading…" : null;
    return totalRecords.toLocaleString();
  }, [listQuery.data, listQuery.isFetching, totalRecords]);

  usePageHeader("History", headerCount);

  const invalidateHistory = () =>
    queryClient.invalidateQueries({ queryKey: ["history", "unified"] });

  const deleteMutation = useMutation({
    mutationFn: ({ instanceId, id }: { instanceId: string; id: number }) =>
      deleteHistoryItem(instanceId, id),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "History entry removed" });
      await invalidateHistory();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Delete failed",
      });
    },
  });

  function setInstanceFilter(value: string) {
    setPage(1);
    void navigate({
      to: "/activity/history",
      search: { instance: value === "all" ? undefined : value },
    });
  }

  const loading = listQuery.isLoading || instancesQuery.isLoading;
  const error = listQuery.error ?? instancesQuery.error;

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <HistoryToolbar
          instanceFilter={activeInstanceFilter ?? "all"}
          instanceOptions={instanceOptions}
          eventType={eventType}
          protocol={protocol}
          pageSize={pageSize}
          refreshing={listQuery.isFetching}
          onInstanceFilterChange={setInstanceFilter}
          onEventTypeChange={(value) => {
            setEventType(value);
            setPage(1);
          }}
          onProtocolChange={(value) => {
            setProtocol(value);
            setPage(1);
          }}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
          onRefresh={() => void invalidateHistory()}
        />
      </div>

      {error ? (
        <Alert color="red" title="Could not load history">
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
                    <Table.Th w={48}> </Table.Th>
                    <Table.Th>Title</Table.Th>
                    <Table.Th>Instance</Table.Th>
                    <Table.Th>Languages</Table.Th>
                    <Table.Th>Quality</Table.Th>
                    <Table.Th>Formats</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th w={88}> </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={8}>
                        <Text c="dimmed" size="sm" ta="center" py="xl">
                          No history events.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    items.map((item) => {
                      const key = historyItemKey(item);
                      const detailPath = historyDetailPath(item);
                      const secondary = historyRowSecondary(item);
                      const isProwlarr = item.kind === "prowlarr";
                      const categories = isProwlarr ? historyCategories(item) : [];
                      return (
                        <Table.Tr key={key} data-history-row>
                          <Table.Td>
                            <HistoryStatusCell item={item} />
                          </Table.Td>
                          <Table.Td>
                            {detailPath ? (
                              <Anchor component={Link} to={detailPath} size="sm" className={classes.title}>
                                {historyRowPrimary(item)}
                              </Anchor>
                            ) : (
                              <Text size="sm" className={classes.title} lineClamp={2}>
                                {historyRowPrimary(item)}
                              </Text>
                            )}
                            {secondary ? (
                              <Text size="xs" c="dimmed" lineClamp={2}>
                                {secondary}
                              </Text>
                            ) : null}
                          </Table.Td>
                          <Table.Td>
                            <Group gap={6} wrap="nowrap">
                              <Text size="sm" lineClamp={1}>
                                {instanceNameFor(historyInstances, item.instanceId)}
                              </Text>
                              <Badge size="xs" variant="light">
                                {kindLabel(item.kind)}
                              </Badge>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            {isProwlarr ? (
                              categories.length > 0 ? (
                                <Group gap={4}>
                                  {categories.slice(0, 4).map((category) => (
                                    <Badge key={category} size="xs" variant="light">
                                      {category}
                                    </Badge>
                                  ))}
                                  {categories.length > 4 ? (
                                    <Text size="xs" c="dimmed">
                                      +{categories.length - 4}
                                    </Text>
                                  ) : null}
                                </Group>
                              ) : (
                                "—"
                              )
                            ) : item.languages.length > 0 ? (
                              item.languages.map((lang) => (
                                <Badge key={lang} size="xs" mr={4} variant="light">
                                  {lang}
                                </Badge>
                              ))
                            ) : (
                              "—"
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {isProwlarr
                                ? formatElapsedMs(item.data.elapsedTime)
                                : (item.quality ?? "Unknown")}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            {isProwlarr ? (
                              <Text size="sm" c="dimmed">
                                {item.data.source || "—"}
                              </Text>
                            ) : item.customFormats.length > 0 ? (
                              <Group gap={4}>
                                {item.customFormats.map((fmt) => (
                                  <Badge key={fmt} size="xs" color="violet" variant="light">
                                    {fmt}
                                  </Badge>
                                ))}
                                {item.customFormatScore != null ? (
                                  <Text size="xs" c="dimmed">
                                    {formatScore(item.customFormatScore)}
                                  </Text>
                                ) : null}
                              </Group>
                            ) : (
                              <Text size="sm">{formatScore(item.customFormatScore)}</Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                              {formatHistoryDate(item.date)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={4} justify="flex-end" className={classes.actions} wrap="nowrap">
                              <Tooltip label="Details">
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  aria-label="History details"
                                  onClick={() => setDetailsItem(item)}
                                >
                                  <InfoIcon size={16} />
                                </ActionIcon>
                              </Tooltip>
                              {!isProwlarr ? (
                                <Tooltip label="Remove">
                                  <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    aria-label="Remove history entry"
                                    loading={deleteMutation.isPending}
                                    onClick={() =>
                                      deleteMutation.mutate({
                                        instanceId: item.instanceId,
                                        id: item.id,
                                      })
                                    }
                                  >
                                    <XIcon size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              ) : null}
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
            <HistoryPager page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>

      <HistoryDetailsModal
        opened={detailsItem != null}
        onClose={() => setDetailsItem(null)}
        item={detailsItem}
      />
    </div>
  );
}
