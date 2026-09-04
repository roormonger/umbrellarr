import {
  ActionIcon,
  Alert,
  Badge,
  Group,
  ScrollArea,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { RssSimpleIcon } from "@phosphor-icons/react/dist/csr/RssSimple";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type {
  IndexerListItem,
  IndexerPrivacy,
  IndexerProtocol,
  IndexerSchemaItem,
  IndexerSortKey,
} from "@umbrellarr/shared";
import { useMemo, useState } from "react";
import { indexerRssHref, listUnifiedIndexers } from "@/api/indexers";
import { listInstances } from "@/api/instances";
import { IndexerAddModal } from "@/components/indexers/IndexerAddModal";
import { IndexerEditModal } from "@/components/indexers/IndexerEditModal";
import { IndexerStatusCell } from "@/components/indexers/IndexerStatusCell";
import {
  IndexersPager,
  IndexersToolbar,
  type IndexerEnabledFilter,
  type IndexerPageSize,
  type IndexerSortDirection,
} from "@/components/indexers/IndexersToolbar";
import { usePageHeader } from "@/layout/pageHeader";
import {
  compareIndexers,
  formatIndexerAdded,
  indexerItemKey,
  privacyLabel,
  protocolLabel,
} from "@/lib/indexerDisplay";
import { ACTIVITY_LIST_STALE_MS } from "@/lib/queryFocus";
import classes from "./IndexersPage.module.css";

export function IndexersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.search });
  const instanceFilter = new URLSearchParams(searchStr).get("instance") ?? undefined;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<IndexerPageSize>(50);
  const [sortKey, setSortKey] = useState<IndexerSortKey>("name");
  const [sortDirection, setSortDirection] = useState<IndexerSortDirection>("asc");
  const [protocol, setProtocol] = useState<IndexerProtocol | "all">("all");
  const [privacy, setPrivacy] = useState<IndexerPrivacy | "all">("all");
  const [enabled, setEnabled] = useState<IndexerEnabledFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [addInstanceId, setAddInstanceId] = useState<string | undefined>(undefined);
  const [editingIndexer, setEditingIndexer] = useState<IndexerListItem | null>(null);
  const [creatingIndexer, setCreatingIndexer] = useState<{
    instanceId: string;
    schemaKey: string;
    title: string;
  } | null>(null);

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  const prowlarrInstances = useMemo(
    () => (instancesQuery.data?.instances ?? []).filter((instance) => instance.kind === "prowlarr"),
    [instancesQuery.data?.instances],
  );

  const instanceOptions = useMemo(() => {
    const named = prowlarrInstances.map((instance) => ({
      value: instance.id,
      label: instance.name,
    }));
    if (prowlarrInstances.length > 1) {
      return [{ value: "all", label: "All instances" }, ...named];
    }
    return named;
  }, [prowlarrInstances]);

  const activeInstanceFilter =
    instanceFilter && prowlarrInstances.some((instance) => instance.id === instanceFilter)
      ? instanceFilter
      : undefined;

  const listQuery = useQuery({
    queryKey: ["indexers", "unified", activeInstanceFilter],
    queryFn: () => listUnifiedIndexers(activeInstanceFilter),
    enabled: prowlarrInstances.length > 0,
    staleTime: ACTIVITY_LIST_STALE_MS,
  });

  const filteredItems = useMemo(() => {
    const items = listQuery.data?.items ?? [];
    return items
      .filter((item) => (protocol === "all" ? true : item.protocol === protocol))
      .filter((item) => (privacy === "all" ? true : item.privacy === privacy))
      .filter((item) => {
        if (enabled === "enabled") return item.enable;
        if (enabled === "disabled") return !item.enable;
        return true;
      })
      .sort((a, b) => compareIndexers(a, b, sortKey, sortDirection));
  }, [listQuery.data?.items, protocol, privacy, enabled, sortKey, sortDirection]);

  const totalRecords = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize);
  const fetchErrors = listQuery.data?.errors ?? [];
  const showInstanceColumn = prowlarrInstances.length > 1;

  const resolvedAddInstanceId =
    addInstanceId ??
    activeInstanceFilter ??
    (prowlarrInstances.length > 0 ? prowlarrInstances[0]?.id : undefined);
  const addInstanceOptions = useMemo(
    () =>
      prowlarrInstances.map((instance) => ({
        value: instance.id,
        label: instance.name,
      })),
    [prowlarrInstances],
  );

  const headerCount = useMemo(() => {
    if (prowlarrInstances.length === 0) return null;
    if (listQuery.data == null) return listQuery.isFetching ? "Loading…" : null;
    return totalRecords.toLocaleString();
  }, [listQuery.data, listQuery.isFetching, prowlarrInstances.length, totalRecords]);

  usePageHeader("Indexers", headerCount);

  function setInstanceFilter(value: string) {
    setPage(1);
    void navigate({
      to: "/indexers",
      search: { instance: value === "all" ? undefined : value },
    });
  }

  function onSortChange(key: IndexerSortKey) {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "added" || key === "priority" ? "desc" : "asc");
  }

  const loading = listQuery.isLoading || instancesQuery.isLoading;
  const error = listQuery.error ?? instancesQuery.error;
  const colSpan = showInstanceColumn ? 10 : 9;

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <IndexersToolbar
          instanceFilter={activeInstanceFilter ?? (prowlarrInstances.length > 1 ? "all" : (prowlarrInstances[0]?.id ?? "all"))}
          instanceOptions={instanceOptions}
          sortKey={sortKey}
          sortDirection={sortDirection}
          protocol={protocol}
          privacy={privacy}
          enabled={enabled}
          pageSize={pageSize}
          refreshing={listQuery.isFetching}
          onInstanceFilterChange={setInstanceFilter}
          onSortChange={onSortChange}
          onProtocolChange={(value) => {
            setProtocol(value);
            setPage(1);
          }}
          onPrivacyChange={(value) => {
            setPrivacy(value);
            setPage(1);
          }}
          onEnabledChange={(value) => {
            setEnabled(value);
            setPage(1);
          }}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
          onRefresh={() => void queryClient.invalidateQueries({ queryKey: ["indexers", "unified"] })}
          addDisabled={prowlarrInstances.length === 0}
          onAdd={() => {
            setAddInstanceId(activeInstanceFilter ?? prowlarrInstances[0]?.id);
            setAddOpen(true);
          }}
        />
      </div>

      {error ? (
        <Alert color="red" title="Could not load indexers">
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      ) : null}

      {prowlarrInstances.length === 0 && !instancesQuery.isLoading ? (
        <Alert color="gray" title="No Prowlarr instances">
          Add a Prowlarr instance in Settings to manage indexers.
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
                      <Table.Th>Name</Table.Th>
                      {showInstanceColumn ? <Table.Th>Instance</Table.Th> : null}
                      <Table.Th>Protocol</Table.Th>
                      <Table.Th>Privacy</Table.Th>
                      <Table.Th>Priority</Table.Th>
                      <Table.Th>Sync Profile</Table.Th>
                      <Table.Th>Added</Table.Th>
                      <Table.Th>Categories</Table.Th>
                      <Table.Th w={120}> </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {pageItems.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={colSpan}>
                          <Text c="dimmed" size="sm" ta="center" py="xl">
                            {prowlarrInstances.length === 0 ? "No Prowlarr instances." : "No indexers."}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      pageItems.map((item) => (
                        <IndexerRow
                          key={indexerItemKey(item)}
                          item={item}
                          showInstance={showInstanceColumn}
                          onEdit={() => setEditingIndexer(item)}
                        />
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </div>
          <div className={classes.pager}>
            <IndexersPager page={safePage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>

      {addOpen && resolvedAddInstanceId ? (
        <IndexerAddModal
          opened
          instanceId={resolvedAddInstanceId}
          instanceOptions={addInstanceOptions}
          onInstanceChange={setAddInstanceId}
          onClose={() => setAddOpen(false)}
          onSelect={(item: IndexerSchemaItem, instanceId) => {
            setAddOpen(false);
            setCreatingIndexer({
              instanceId,
              schemaKey: item.key,
              title: item.name,
            });
          }}
        />
      ) : null}

      {creatingIndexer ? (
        <IndexerEditModal
          mode="create"
          opened
          instanceId={creatingIndexer.instanceId}
          schemaKey={creatingIndexer.schemaKey}
          title={creatingIndexer.title}
          onClose={() => setCreatingIndexer(null)}
        />
      ) : null}

      {editingIndexer ? (
        <IndexerEditModal
          opened
          instanceId={editingIndexer.instanceId}
          indexerId={editingIndexer.id}
          title={editingIndexer.name}
          onClose={() => setEditingIndexer(null)}
        />
      ) : null}
    </div>
  );
}

function IndexerRow({
  item,
  showInstance,
  onEdit,
}: {
  item: IndexerListItem;
  showInstance: boolean;
  onEdit: () => void;
}) {
  const rssHref = indexerRssHref(item.instanceId, item.id);
  return (
    <Table.Tr>
      <Table.Td>
        <IndexerStatusCell item={item} />
      </Table.Td>
      <Table.Td>
        <Text size="sm" className={classes.name} lineClamp={1}>
          {item.name}
        </Text>
      </Table.Td>
      {showInstance ? (
        <Table.Td>
          <Text size="sm" lineClamp={1}>
            {item.instanceName}
          </Text>
        </Table.Td>
      ) : null}
      <Table.Td>
        <Badge size="xs" variant="light">
          {protocolLabel(item.protocol)}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge size="xs" variant="light" color={item.privacy === "private" ? "orange" : item.privacy === "semiPrivate" ? "yellow" : "gray"}>
          {privacyLabel(item.privacy)}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{item.priority}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" lineClamp={1}>
          {item.syncProfile || "—"}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" style={{ whiteSpace: "nowrap" }}>
          {item.added ? formatIndexerAdded(item.added) : "—"}
        </Text>
      </Table.Td>
      <Table.Td>
        {item.categories.length > 0 ? (
          <Group gap={4} className={classes.categories}>
            {item.categories.map((category, index) => (
              <Badge key={`${index}-${category}`} size="xs" variant="light">
                {category}
              </Badge>
            ))}
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            —
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap={4} justify="flex-end" className={classes.actions} wrap="nowrap">
          <Tooltip label="Edit">
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={`Edit ${item.name}`}
              onClick={onEdit}
            >
              <PencilSimpleIcon size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="RSS">
            <ActionIcon
              component="a"
              href={rssHref}
              target="_blank"
              rel="noreferrer"
              variant="subtle"
              color="gray"
              aria-label={`RSS feed for ${item.name}`}
            >
              <RssSimpleIcon size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={item.websiteUrl ? "Website" : "No website"}>
            {item.websiteUrl ? (
              <ActionIcon
                component="a"
                href={item.websiteUrl}
                target="_blank"
                rel="noreferrer"
                variant="subtle"
                color="gray"
                aria-label={`Website for ${item.name}`}
              >
                <ArrowSquareOutIcon size={16} />
              </ActionIcon>
            ) : (
              <ActionIcon variant="subtle" color="gray" aria-label={`Website for ${item.name}`} disabled>
                <ArrowSquareOutIcon size={16} />
              </ActionIcon>
            )}
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}
