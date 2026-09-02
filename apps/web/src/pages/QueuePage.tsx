import {
  ActionIcon,
  Alert,
  Badge,
  Checkbox,
  Group,
  Progress,
  ScrollArea,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { UserIcon } from "@phosphor-icons/react/dist/csr/User";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { ArrKind, QueueListItem, QueueProtocol, QueueRemoveRequest, QueueStatusFilter } from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import { listInstances } from "@/api/instances";
import { grabQueueItems, listUnifiedQueue, refreshQueue, removeQueueItems } from "@/api/queue";
import { QueueManualImportModal } from "@/components/queue/QueueManualImportModal";
import { QueueRemoveModal } from "@/components/queue/QueueRemoveModal";
import { QueueStatusCell } from "@/components/queue/QueueStatusCell";
import { QueueToolbar } from "@/components/queue/QueueToolbar";
import { usePageHeader } from "@/layout/pageHeader";
import {
  formatFormats,
  groupQueueItemsByInstance,
  instanceNameFor,
  kindLabel,
  progressPercent,
  queueItemKey,
  queueRowPrimary,
  queueRowSecondary,
} from "@/lib/queueDisplay";
import { focusAwareRefetchInterval } from "@/lib/queryFocus";
import classes from "./QueuePage.module.css";

const POLL_MS = 8_000;
const PAGE_SIZE = 200;
const LIST_STALE_MS = 90_000;

export function QueuePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.search });
  const instanceFilter = new URLSearchParams(searchStr).get("instance") ?? undefined;
  const [includeUnknown, setIncludeUnknown] = useState(true);
  const [protocol, setProtocol] = useState<QueueProtocol | "all">("all");
  const [status, setStatus] = useState<QueueStatusFilter>("all");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [removeItems, setRemoveItems] = useState<QueueListItem[]>([]);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<QueueListItem | null>(null);

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
    queryKey: ["queue", "unified", activeInstanceFilter, includeUnknown, protocol, status],
    queryFn: () =>
      listUnifiedQueue({
        page: 1,
        pageSize: PAGE_SIZE,
        includeUnknown,
        protocol,
        status,
        instanceId: activeInstanceFilter,
      }),
    enabled: arrInstances.length > 0,
    staleTime: LIST_STALE_MS,
    refetchInterval: focusAwareRefetchInterval(POLL_MS),
    refetchIntervalInBackground: false,
  });

  const items = listQuery.data?.items ?? [];
  const totalRecords = listQuery.data?.totalRecords ?? items.length;
  const fetchErrors = listQuery.data?.errors ?? [];

  const headerCount = useMemo(() => {
    if (listQuery.data == null) return listQuery.isFetching ? "Loading…" : null;
    return totalRecords.toLocaleString();
  }, [listQuery.data, listQuery.isFetching, totalRecords]);

  usePageHeader("Queue", headerCount);

  useEffect(() => {
    setSelectedKeys([]);
    setRemoveOpen(false);
    setRemoveItems([]);
    setImportTarget(null);
  }, [activeInstanceFilter, includeUnknown, protocol, status]);

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const selectedItems = items.filter((item) => selectedSet.has(queueItemKey(item)));
  const selectedGrabItems = selectedItems.filter((item) => item.canGrab);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const invalidateQueue = () =>
    queryClient.invalidateQueries({ queryKey: ["queue", "unified"] });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const targets = activeInstanceFilter
        ? [activeInstanceFilter]
        : arrInstances.map((instance) => instance.id);
      await Promise.all(targets.map((instanceId) => refreshQueue(instanceId)));
      await invalidateQueue();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Refresh failed",
      });
    },
  });

  const grabMutation = useMutation({
    mutationFn: async (itemsToGrab: QueueListItem[]) => {
      const groups = groupQueueItemsByInstance(itemsToGrab);
      const results = await Promise.allSettled(
        [...groups.entries()].map(([instanceId, groupItems]) =>
          grabQueueItems(instanceId, { ids: groupItems.map((item) => item.id) }),
        ),
      );
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        throw new Error(`Grab failed for ${failed.length} instance(s)`);
      }
    },
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Grab queued in Arr" });
      setSelectedKeys([]);
      await invalidateQueue();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Grab failed",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({
      itemsToRemove,
      request,
    }: {
      itemsToRemove: QueueListItem[];
      request: Omit<QueueRemoveRequest, "ids">;
    }) => {
      const groups = groupQueueItemsByInstance(itemsToRemove);
      const results = await Promise.allSettled(
        [...groups.entries()].map(([instanceId, groupItems]) =>
          removeQueueItems(instanceId, {
            ...request,
            ids: groupItems.map((item) => item.id),
          }),
        ),
      );
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        const succeeded = results.length - failed.length;
        throw new Error(`Removed ${succeeded}/${results.length} batch(es)`);
      }
    },
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Removed from queue" });
      setRemoveOpen(false);
      setSelectedKeys([]);
      await invalidateQueue();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Remove failed",
      });
    },
  });

  function setInstanceFilter(value: string) {
    void navigate({
      to: "/activity/queue",
      search: { instance: value === "all" ? undefined : value },
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedKeys(checked ? items.map((item) => queueItemKey(item)) : []);
  }

  function toggleRow(item: QueueListItem, checked: boolean) {
    const key = queueItemKey(item);
    setSelectedKeys((prev) =>
      checked ? (prev.includes(key) ? prev : [...prev, key]) : prev.filter((value) => value !== key),
    );
  }

  const loading = listQuery.isLoading || instancesQuery.isLoading;
  const error = listQuery.error ?? instancesQuery.error;

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <QueueToolbar
          instanceFilter={activeInstanceFilter ?? "all"}
          instanceOptions={instanceOptions}
          includeUnknown={includeUnknown}
          protocol={protocol}
          status={status}
          selectedCount={selectedItems.length}
          grabEnabled={selectedGrabItems.length > 0 && !grabMutation.isPending}
          removeEnabled={selectedItems.length > 0}
          showStatusFilter
          refreshing={refreshMutation.isPending}
          onInstanceFilterChange={setInstanceFilter}
          onIncludeUnknownChange={setIncludeUnknown}
          onProtocolChange={setProtocol}
          onStatusChange={setStatus}
          onRefresh={() => refreshMutation.mutate()}
          onGrabSelected={() => grabMutation.mutate(selectedGrabItems)}
          onRemoveSelected={() => {
            setRemoveItems(selectedItems);
            setRemoveOpen(true);
          }}
        />
      </div>

      {error ? (
        <Alert color="red" title="Could not load queue">
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

      {loading ? (
        <Skeleton height={240} radius="md" />
      ) : (
        <div className={classes.body}>
          <div className={classes.tableWrap}>
            <ScrollArea h="100%" offsetScrollbars type="auto">
              <Table striped highlightOnHover stickyHeader horizontalSpacing="sm" verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}>
                      <Checkbox
                        checked={allSelected}
                        indeterminate={!allSelected && selectedItems.length > 0}
                        aria-label="Select all queue items"
                        onChange={(e) => toggleAll(e.currentTarget.checked)}
                      />
                    </Table.Th>
                    <Table.Th w={48}> </Table.Th>
                    <Table.Th>Title</Table.Th>
                    <Table.Th>Instance</Table.Th>
                    <Table.Th>Quality</Table.Th>
                    <Table.Th>Formats</Table.Th>
                    <Table.Th>Time Left</Table.Th>
                    <Table.Th>Progress</Table.Th>
                    <Table.Th w={110}> </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={9}>
                        <Text c="dimmed" size="sm" ta="center" py="xl">
                          Queue is empty.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    items.map((item) => {
                      const key = queueItemKey(item);
                      const percent = progressPercent(item);
                      const secondary = queueRowSecondary(item);
                      return (
                        <Table.Tr key={key} data-queue-row data-download-id={item.downloadId ?? ""}>
                          <Table.Td>
                            <Checkbox
                              checked={selectedSet.has(key)}
                              aria-label={`Select ${item.title}`}
                              onChange={(e) => toggleRow(item, e.currentTarget.checked)}
                            />
                          </Table.Td>
                          <Table.Td>
                            <QueueStatusCell item={item} />
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" className={classes.title} lineClamp={2}>
                              {queueRowPrimary(item)}
                            </Text>
                            {secondary ? (
                              <Text size="xs" c="dimmed" lineClamp={2}>
                                {secondary}
                              </Text>
                            ) : null}
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
                            <Text size="sm">{item.qualityName ?? "—"}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" lineClamp={2}>
                              {formatFormats(item)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{item.timeleft || "—"}</Text>
                          </Table.Td>
                          <Table.Td className={classes.progressCell}>
                            {percent == null ? (
                              <Text size="sm">—</Text>
                            ) : (
                              <Progress value={percent} size="sm" aria-label={`${percent}%`} />
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Group gap={4} justify="flex-end" className={classes.actions} wrap="nowrap">
                              {item.downloadId ? (
                                <Tooltip label="Manual import">
                                  <ActionIcon
                                    variant="subtle"
                                    aria-label="Manual import"
                                    onClick={() => setImportTarget(item)}
                                  >
                                    <UserIcon size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              ) : null}
                              {item.canGrab ? (
                                <Tooltip label="Grab">
                                  <ActionIcon
                                    variant="subtle"
                                    aria-label="Grab"
                                    loading={grabMutation.isPending}
                                    onClick={() => grabMutation.mutate([item])}
                                  >
                                    <DownloadSimpleIcon size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              ) : null}
                              <Tooltip label="Remove">
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  aria-label="Remove from queue"
                                  onClick={() => {
                                    setRemoveItems([item]);
                                    setRemoveOpen(true);
                                  }}
                                >
                                  <XIcon size={16} />
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
          </div>
        </div>
      )}

      <QueueRemoveModal
        opened={removeOpen}
        items={removeItems}
        removing={removeMutation.isPending}
        onClose={() => setRemoveOpen(false)}
        onConfirm={(flags) => {
          if (!removeItems.length) return;
          removeMutation.mutate({ itemsToRemove: removeItems, request: flags });
        }}
      />

      {importTarget?.downloadId ? (
        <QueueManualImportModal
          opened
          onClose={() => setImportTarget(null)}
          instanceId={importTarget.instanceId}
          kind={importTarget.kind}
          downloadId={importTarget.downloadId}
          title={`Manual Import - ${importTarget.title}`}
        />
      ) : null}
    </div>
  );
}
