import { ActionIcon, Button, Group, SegmentedControl, Select, Text, Tooltip } from "@mantine/core";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import type { WantedMode } from "@umbrellarr/shared";
import classes from "./WantedToolbar.module.css";

export const WANTED_PAGE_SIZES = [10, 25, 50, 100] as const;
export type WantedPageSize = (typeof WANTED_PAGE_SIZES)[number];

const PAGE_SIZE_OPTIONS = WANTED_PAGE_SIZES.map((size) => ({
  value: String(size),
  label: String(size),
}));

export type WantedInstanceOption = {
  value: string;
  label: string;
};

export function WantedPager({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <Group gap="xs" wrap="nowrap" justify="center">
      <Button
        variant="default"
        size="compact-sm"
        disabled={page <= 1}
        aria-label="First page"
        onClick={() => onPageChange(1)}
      >
        «
      </Button>
      <Button
        variant="default"
        size="compact-sm"
        disabled={page <= 1}
        aria-label="Previous page"
        onClick={() => onPageChange(page - 1)}
      >
        ‹
      </Button>
      <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>
        {page} / {totalPages}
      </span>
      <Button
        variant="default"
        size="compact-sm"
        disabled={page >= totalPages}
        aria-label="Next page"
        onClick={() => onPageChange(page + 1)}
      >
        ›
      </Button>
      <Button
        variant="default"
        size="compact-sm"
        disabled={page >= totalPages}
        aria-label="Last page"
        onClick={() => onPageChange(totalPages)}
      >
        »
      </Button>
    </Group>
  );
}

export function WantedToolbar({
  mode,
  instanceFilter,
  instanceOptions,
  pageSize,
  monitored,
  selectedCount,
  refreshing,
  searching,
  togglingMonitor,
  onModeChange,
  onInstanceFilterChange,
  onPageSizeChange,
  onMonitoredChange,
  onRefresh,
  onSearchAll,
  onToggleMonitorSelected,
}: {
  mode: WantedMode;
  instanceFilter: string;
  instanceOptions: WantedInstanceOption[];
  pageSize: WantedPageSize;
  monitored: boolean;
  selectedCount: number;
  refreshing?: boolean;
  searching?: boolean;
  togglingMonitor?: boolean;
  onModeChange: (mode: WantedMode) => void;
  onInstanceFilterChange: (value: string) => void;
  onPageSizeChange: (pageSize: WantedPageSize) => void;
  onMonitoredChange: (monitored: boolean) => void;
  onRefresh: () => void;
  onSearchAll: () => void;
  onToggleMonitorSelected: () => void;
}) {
  return (
    <Group gap="sm" wrap="wrap" align="center" justify="space-between">
      <Group gap="sm" wrap="wrap" align="center">
        <Select
          size="sm"
          w={200}
          allowDeselect={false}
          aria-label="Instance filter"
          data={instanceOptions}
          value={instanceFilter}
          onChange={(value) => onInstanceFilterChange(value ?? "all")}
        />
        <SegmentedControl
          size="sm"
          value={mode}
          onChange={(value) => onModeChange(value as WantedMode)}
          data={[
            { label: "Missing", value: "missing" },
            { label: "Cutoff Unmet", value: "cutoff" },
          ]}
        />
        <SegmentedControl
          size="sm"
          value={monitored ? "monitored" : "unmonitored"}
          onChange={(value) => onMonitoredChange(value === "monitored")}
          data={[
            { label: "Monitored", value: "monitored" },
            { label: "Unmonitored", value: "unmonitored" },
          ]}
        />
        <Tooltip label="Search All">
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Search All"
            loading={searching}
            onClick={onSearchAll}
          >
            <MagnifyingGlassIcon size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={monitored ? "Unmonitor Selected" : "Monitor Selected"}>
          <span>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label={monitored ? "Unmonitor Selected" : "Monitor Selected"}
              disabled={selectedCount === 0}
              loading={togglingMonitor}
              onClick={onToggleMonitorSelected}
            >
              <BookmarkSimpleIcon size={18} weight={monitored ? "fill" : "regular"} />
            </ActionIcon>
          </span>
        </Tooltip>
      </Group>

      <Group gap="sm" wrap="nowrap" align="center">
        <Group gap={6} wrap="nowrap">
          <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
            Per page
          </Text>
          <Select
            size="sm"
            className={classes.pageSize}
            allowDeselect={false}
            aria-label="Items per page"
            data={PAGE_SIZE_OPTIONS}
            value={String(pageSize)}
            onChange={(value) => {
              const next = Number(value);
              if (WANTED_PAGE_SIZES.includes(next as WantedPageSize)) {
                onPageSizeChange(next as WantedPageSize);
              }
            }}
          />
        </Group>
        <Tooltip label="Refresh">
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Refresh"
            loading={refreshing}
            onClick={onRefresh}
          >
            <ArrowsClockwiseIcon size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
