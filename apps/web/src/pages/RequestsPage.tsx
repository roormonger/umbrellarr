import { Button, Group, Loader, Select, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { UserIcon } from "@phosphor-icons/react/dist/csr/User";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type {
  MediaRequestItem,
  RequestFilter,
  RequestSort,
  RequestSortDirection,
} from "@umbrellarr/shared";
import { useMemo, useState } from "react";
import {
  approveRequest,
  declineRequest,
  listRequestUsers,
  listRequests,
} from "@/api/requests";
import { APP_LOADER_SIZE } from "@/components/QuantumLoader";
import { RequestEditModal } from "@/components/requests/RequestEditModal";
import { RequestListRow } from "@/components/requests/RequestListRow";
import {
  requestSortPreset,
  RequestsToolbar,
  type RequestSortPreset,
} from "@/components/requests/RequestsToolbar";
import { usePageHeader } from "@/layout/pageHeader";
import classes from "./RequestsPage.module.css";

const PAGE_SIZE = 25;

export function RequestsPage() {
  const { instanceId } = useParams({ from: "/app/requests/$instanceId" });
  const queryClient = useQueryClient();
  const [mediaType, setMediaType] = useState<"all" | "movie" | "tv">("all");
  const [filter, setFilter] = useState<RequestFilter>("pending");
  const [sort, setSort] = useState<RequestSort>("added");
  const [sortDirection, setSortDirection] = useState<RequestSortDirection>("desc");
  const [requestedBy, setRequestedBy] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [editRequest, setEditRequest] = useState<MediaRequestItem | null>(null);

  const usersQuery = useQuery({
    queryKey: ["request-users", instanceId],
    queryFn: () => listRequestUsers(instanceId),
    staleTime: 60_000,
  });

  const requestedById =
    requestedBy !== "all" && Number.isFinite(Number(requestedBy))
      ? Number(requestedBy)
      : undefined;

  const listQuery = useQuery({
    queryKey: [
      "requests",
      instanceId,
      mediaType,
      filter,
      sort,
      sortDirection,
      requestedById ?? "all",
      page,
    ],
    queryFn: () =>
      listRequests(instanceId, {
        take: PAGE_SIZE,
        skip: page * PAGE_SIZE,
        mediaType,
        filter,
        sort,
        sortDirection,
        requestedBy: requestedById,
      }),
    refetchInterval: 15_000,
  });

  const total = listQuery.data?.pageInfo.results ?? 0;
  const pages = Math.max(1, listQuery.data?.pageInfo.pages ?? 1);

  usePageHeader("Requests", listQuery.data ? String(total) : null);

  const userOptions = useMemo(() => {
    const users = (usersQuery.data?.users ?? []).map((user) => ({
      value: String(user.id),
      label: user.email ? `${user.displayName} (${user.email})` : user.displayName,
    }));
    return [{ value: "all", label: "All" }, ...users];
  }, [usersQuery.data?.users]);

  const approveMutation = useMutation({
    mutationFn: (requestId: number) => approveRequest(instanceId, requestId),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Request approved" });
      await queryClient.invalidateQueries({ queryKey: ["requests", instanceId] });
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
    mutationFn: (requestId: number) => declineRequest(instanceId, requestId),
    onSuccess: async () => {
      notifications.show({ color: "blue", message: "Request declined" });
      await queryClient.invalidateQueries({ queryKey: ["requests", instanceId] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Decline failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

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

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <Group justify="space-between" align="center" gap="md" wrap="wrap">
          <Select
            placeholder="Filter by user…"
            leftSection={<UserIcon />}
            data={userOptions}
            value={requestedBy}
            allowDeselect={false}
            searchable
            nothingFoundMessage="No users"
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
          {listQuery.data.results.map((item) => (
            <RequestListRow
              key={item.id}
              instanceId={instanceId}
              request={item}
              approving={
                approveMutation.isPending && approveMutation.variables === item.id
              }
              declining={
                declineMutation.isPending && declineMutation.variables === item.id
              }
              onApprove={() => approveMutation.mutate(item.id)}
              onDecline={() => declineMutation.mutate(item.id)}
              onEdit={() => setEditRequest(item)}
            />
          ))}
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
        instanceId={instanceId}
        request={editRequest}
      />
    </div>
  );
}
