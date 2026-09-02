import { Alert, Button, Group, Loader, Select, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { UserIcon } from "@phosphor-icons/react/dist/csr/User";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type {
  MediaRequestItem,
  RequestFilter,
  RequestSort,
  RequestSortDirection,
} from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import {
  approveRequest,
  declineRequest,
  listRequestUsers,
  listUnifiedRequests,
} from "@/api/requests";
import { listInstances } from "@/api/instances";
import { APP_LOADER_SIZE } from "@/components/QuantumLoader";
import { RequestEditModal } from "@/components/requests/RequestEditModal";
import { RequestListRow } from "@/components/requests/RequestListRow";
import {
  requestSortPreset,
  RequestsToolbar,
  type RequestSortPreset,
} from "@/components/requests/RequestsToolbar";
import { usePageHeader } from "@/layout/pageHeader";
import { ACTIVITY_LIST_STALE_MS, focusAwareRefetchInterval, SEERR_LIST_POLL_MS } from "@/lib/queryFocus";
import classes from "./RequestsPage.module.css";

const PAGE_SIZE = 25;

export function RequestsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.search });
  const instanceFilter = new URLSearchParams(searchStr).get("instance") ?? undefined;
  const [mediaType, setMediaType] = useState<"all" | "movie" | "tv">("all");
  const [filter, setFilter] = useState<RequestFilter>("pending");
  const [sort, setSort] = useState<RequestSort>("added");
  const [sortDirection, setSortDirection] = useState<RequestSortDirection>("desc");
  const [requestedBy, setRequestedBy] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [editRequest, setEditRequest] = useState<MediaRequestItem | null>(null);

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  const seerrInstances = useMemo(
    () => (instancesQuery.data?.instances ?? []).filter((instance) => instance.kind === "seerr"),
    [instancesQuery.data?.instances],
  );

  const instanceOptions = useMemo(
    () => [
      { value: "all", label: "All instances" },
      ...seerrInstances.map((instance) => ({
        value: instance.id,
        label: instance.name,
      })),
    ],
    [seerrInstances],
  );

  const activeInstanceFilter =
    instanceFilter && seerrInstances.some((instance) => instance.id === instanceFilter)
      ? instanceFilter
      : undefined;

  useEffect(() => {
    if (!activeInstanceFilter && requestedBy !== "all") {
      setRequestedBy("all");
    }
  }, [activeInstanceFilter, requestedBy]);

  const usersQuery = useQuery({
    queryKey: ["request-users", activeInstanceFilter],
    queryFn: () => listRequestUsers(activeInstanceFilter!),
    enabled: Boolean(activeInstanceFilter),
    staleTime: 60_000,
  });

  const requestedById =
    activeInstanceFilter &&
    requestedBy !== "all" &&
    Number.isFinite(Number(requestedBy))
      ? Number(requestedBy)
      : undefined;

  const listQuery = useQuery({
    queryKey: [
      "requests",
      "unified",
      activeInstanceFilter,
      mediaType,
      filter,
      sort,
      sortDirection,
      requestedById ?? "all",
      page,
    ],
    queryFn: () =>
      listUnifiedRequests({
        take: PAGE_SIZE,
        skip: page * PAGE_SIZE,
        mediaType,
        filter,
        sort,
        sortDirection,
        requestedBy: requestedById,
        instanceId: activeInstanceFilter,
      }),
    enabled: seerrInstances.length > 0,
    staleTime: ACTIVITY_LIST_STALE_MS,
    refetchInterval: focusAwareRefetchInterval(SEERR_LIST_POLL_MS),
    refetchIntervalInBackground: false,
  });

  const total = listQuery.data?.pageInfo.results ?? 0;
  const pages = Math.max(1, listQuery.data?.pageInfo.pages ?? 1);
  const fetchErrors = listQuery.data?.errors ?? [];

  usePageHeader("Requests", listQuery.data ? String(total) : null);

  const userOptions = useMemo(() => {
    const users = (usersQuery.data?.users ?? []).map((user) => ({
      value: String(user.id),
      label: user.email ? `${user.displayName} (${user.email})` : user.displayName,
    }));
    return [{ value: "all", label: "All" }, ...users];
  }, [usersQuery.data?.users]);

  const invalidateRequests = () =>
    queryClient.invalidateQueries({ queryKey: ["requests", "unified"] });

  const approveMutation = useMutation({
    mutationFn: ({ instanceId, requestId }: { instanceId: string; requestId: number }) =>
      approveRequest(instanceId, requestId),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Request approved" });
      await invalidateRequests();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Approve failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: ({ instanceId, requestId }: { instanceId: string; requestId: number }) =>
      declineRequest(instanceId, requestId),
    onSuccess: async () => {
      notifications.show({ color: "blue", message: "Request declined" });
      await invalidateRequests();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Decline failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  function setInstanceFilter(value: string) {
    setPage(0);
    void navigate({
      to: "/requests",
      search: { instance: value === "all" ? undefined : value },
    });
  }

  function handleSortPresetChange(preset: RequestSortPreset) {
    if (preset === "oldest") {
      setSort("added");
      setSortDirection("asc");
    } else if (preset === "modified") {
      setSort("modified");
      setSortDirection("desc");
    } else {
      setSort("added");
      setSortDirection("desc");
    }
    setPage(0);
  }

  const showInstanceLabel = !activeInstanceFilter;

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
          <Select
            placeholder="Filter by user…"
            leftSection={<UserIcon />}
            data={userOptions}
            value={requestedBy}
            allowDeselect={false}
            searchable
            nothingFoundMessage="No users"
            disabled={!activeInstanceFilter}
            onChange={(value) => {
              setRequestedBy(value ?? "all");
              setPage(0);
            }}
            maw={360}
            style={{ flex: 1, minWidth: 220 }}
            aria-label="Filter by user"
          />

          <RequestsToolbar
            mediaType={mediaType}
            filter={filter}
            sortPreset={requestSortPreset(sort, sortDirection)}
            onMediaTypeChange={(value) => {
              setMediaType(value);
              setPage(0);
            }}
            onFilterChange={(value) => {
              setFilter(value);
              setPage(0);
            }}
            onSortPresetChange={handleSortPresetChange}
          />
        </Group>
      </div>

      {fetchErrors.length > 0 ? (
        <Alert color="orange" title="Some instances could not be loaded" mb="sm">
          <Stack gap={4}>
            {fetchErrors.map((entry) => (
              <Text key={entry.instanceId} size="sm">
                {entry.instanceName}: {entry.message}
              </Text>
            ))}
          </Stack>
        </Alert>
      ) : null}

      {listQuery.isLoading && (
        <Group justify="center" py="xl">
          <Loader size={APP_LOADER_SIZE} />
        </Group>
      )}

      {listQuery.error && (
        <Text c="red" size="sm">
          {listQuery.error instanceof Error
            ? listQuery.error.message
            : "Failed to load requests"}
        </Text>
      )}

      {listQuery.isSuccess && listQuery.data.results.length === 0 && (
        <Text c="dimmed" size="sm">
          No requests match this filter.
        </Text>
      )}

      {listQuery.isSuccess && listQuery.data.results.length > 0 && (
        <Stack gap="sm" className={classes.list}>
          {listQuery.data.results.map((item) => {
            const rowInstanceId = item.instanceId ?? activeInstanceFilter ?? "";
            return (
              <RequestListRow
                key={`${rowInstanceId}:${item.id}`}
                instanceId={rowInstanceId}
                request={item}
                showInstanceLabel={showInstanceLabel}
                approving={
                  approveMutation.isPending &&
                  approveMutation.variables?.instanceId === rowInstanceId &&
                  approveMutation.variables?.requestId === item.id
                }
                declining={
                  declineMutation.isPending &&
                  declineMutation.variables?.instanceId === rowInstanceId &&
                  declineMutation.variables?.requestId === item.id
                }
                onApprove={() =>
                  approveMutation.mutate({ instanceId: rowInstanceId, requestId: item.id })
                }
                onDecline={() =>
                  declineMutation.mutate({ instanceId: rowInstanceId, requestId: item.id })
                }
                onEdit={() => setEditRequest(item)}
              />
            );
          })}
        </Stack>
      )}

      {listQuery.isSuccess && pages > 1 && (
        <div className={classes.pager}>
          <Text size="sm" c="dimmed">
            Page {page + 1} of {pages} · {total} total
          </Text>
          <Group gap="xs">
            <Button
              size="xs"
              variant="default"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="xs"
              variant="default"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </Group>
        </div>
      )}

      <RequestEditModal
        opened={editRequest != null}
        onClose={() => setEditRequest(null)}
        instanceId={editRequest?.instanceId ?? activeInstanceFilter ?? ""}
        request={editRequest}
      />
    </div>
  );
}
