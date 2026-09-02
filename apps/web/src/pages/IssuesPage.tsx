import { Alert, Button, Group, Loader, Select, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { IssueFilter, IssueSort, RequestSortDirection } from "@umbrellarr/shared";
import { useMemo, useState } from "react";
import { listUnifiedIssues } from "@/api/issues";
import { listInstances } from "@/api/instances";
import { APP_LOADER_SIZE } from "@/components/QuantumLoader";
import { IssueListRow } from "@/components/issues/IssueListRow";
import {
  issueSortPreset,
  IssuesToolbar,
  type IssueSortPreset,
} from "@/components/issues/IssuesToolbar";
import { usePageHeader } from "@/layout/pageHeader";
import { ACTIVITY_LIST_STALE_MS, focusAwareRefetchInterval, SEERR_LIST_POLL_MS } from "@/lib/queryFocus";
import classes from "./IssuesPage.module.css";

const PAGE_SIZE = 25;

export function IssuesPage() {
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.search });
  const instanceFilter = new URLSearchParams(searchStr).get("instance") ?? undefined;
  const [filter, setFilter] = useState<IssueFilter>("open");
  const [sort, setSort] = useState<IssueSort>("added");
  const [sortDirection, setSortDirection] = useState<RequestSortDirection>("desc");
  const [page, setPage] = useState(0);

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

  const listQuery = useQuery({
    queryKey: ["issues", "unified", activeInstanceFilter, filter, sort, sortDirection, page],
    queryFn: () =>
      listUnifiedIssues({
        take: PAGE_SIZE,
        skip: page * PAGE_SIZE,
        filter,
        sort,
        sortDirection,
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

  usePageHeader("Issues", listQuery.data ? String(total) : null);

  function setInstanceFilter(value: string) {
    setPage(0);
    void navigate({
      to: "/issues",
      search: { instance: value === "all" ? undefined : value },
    });
  }

  function handleSortPresetChange(preset: IssueSortPreset) {
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
          <IssuesToolbar
            filter={filter}
            sortPreset={issueSortPreset(sort, sortDirection)}
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
          {listQuery.error instanceof Error ? listQuery.error.message : "Failed to load issues"}
        </Text>
      )}

      {listQuery.isSuccess && listQuery.data.results.length === 0 && (
        <Text c="dimmed" size="sm">
          No issues match this filter.
        </Text>
      )}

      {listQuery.isSuccess && listQuery.data.results.length > 0 && (
        <Stack gap="sm" className={classes.list}>
          {listQuery.data.results.map((item) => {
            const rowInstanceId = item.instanceId ?? activeInstanceFilter ?? "";
            return (
              <IssueListRow
                key={`${rowInstanceId}:${item.id}`}
                instanceId={rowInstanceId}
                issue={item}
                showInstanceLabel={showInstanceLabel}
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
    </div>
  );
}
