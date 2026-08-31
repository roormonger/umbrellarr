import { Button, Group, Loader, Select, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type {
  MediaRequestItem,
  RequestFilter,
  RequestSort,
  RequestSortDirection,
} from "@umbrellarr/shared";
import { useMemo, useState } from "react";
import { approveRequest, declineRequest, listRequests } from "@/api/requests";
import { APP_LOADER_SIZE } from "@/components/QuantumLoader";
import { RequestEditModal } from "@/components/requests/RequestEditModal";
import { RequestListRow } from "@/components/requests/RequestListRow";
import { usePageHeader } from "@/layout/pageHeader";
import classes from "./RequestsPage.module.css";

const PAGE_SIZE = 25;

const FILTER_OPTIONS: { value: RequestFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "processing", label: "Processing" },
  { value: "available", label: "Available" },
  { value: "unavailable", label: "Unavailable" },
  { value: "failed", label: "Failed" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

export function RequestsPage() {
  const { instanceId } = useParams({ from: "/app/requests/$instanceId" });
  const queryClient = useQueryClient();
  const [mediaType, setMediaType] = useState<"all" | "movie" | "tv">("all");
  const [filter, setFilter] = useState<RequestFilter>("pending");
  const [sort, setSort] = useState<RequestSort>("added");
  const [sortDirection, setSortDirection] = useState<RequestSortDirection>("desc");
  const [page, setPage] = useState(0);
  const [editRequest, setEditRequest] = useState<MediaRequestItem | null>(null);

  const listQuery = useQuery({
    queryKey: [
      "requests",
      instanceId,
      mediaType,
      filter,
      sort,
      sortDirection,
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
      }),
    refetchInterval: 15_000,
  });

  const total = listQuery.data?.pageInfo.results ?? 0;
  const pages = Math.max(1, listQuery.data?.pageInfo.pages ?? 1);

  usePageHeader(
    "Requests",
    listQuery.data ? String(total) : null,
  );

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

  const sortSelectValue = useMemo(() => {
    if (sort === "added" && sortDirection === "desc") return "recent";
    if (sort === "modified" && sortDirection === "desc") return "modified";
    if (sort === "added" && sortDirection === "asc") return "oldest";
    return "recent";
  }, [sort, sortDirection]);

  return (
    <div className={classes.page}>
      <div className={classes.toolbar}>
        <Select
          label="Type"
          data={[
            { value: "all", label: "All" },
            { value: "movie", label: "Movies" },
            { value: "tv", label: "Series" },
          ]}
          value={mediaType}
          allowDeselect={false}
          onChange={(value) => {
            setMediaType((value as "all" | "movie" | "tv") ?? "all");
            setPage(0);
          }}
          w={140}
        />
        <Select
          label="Filter"
          data={FILTER_OPTIONS}
          value={filter}
          allowDeselect={false}
          onChange={(value) => {
            setFilter((value as RequestFilter) ?? "pending");
            setPage(0);
          }}
          w={160}
        />
        <Select
          label="Sort"
          data={[
            { value: "recent", label: "Most Recent" },
            { value: "oldest", label: "Oldest" },
            { value: "modified", label: "Recently Modified" },
          ]}
          value={sortSelectValue}
          allowDeselect={false}
          onChange={(value) => {
            if (value === "oldest") {
              setSort("added");
              setSortDirection("asc");
            } else if (value === "modified") {
              setSort("modified");
              setSortDirection("desc");
            } else {
              setSort("added");
              setSortDirection("desc");
            }
            setPage(0);
          }}
          w={180}
        />
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
