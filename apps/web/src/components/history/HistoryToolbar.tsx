import { ActionIcon, Button, Group, Menu, Select, Text, Tooltip } from "@mantine/core";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { FunnelIcon } from "@phosphor-icons/react/dist/csr/Funnel";
import {
  HISTORY_EVENT_TYPE_FILTER_OPTIONS,
  HISTORY_PROTOCOL_FILTER_OPTIONS,
  type HistoryEventType,
  type HistoryProtocolFilter,
} from "@umbrellarr/shared";
import classes from "./HistoryToolbar.module.css";

export const HISTORY_PAGE_SIZES = [10, 25, 50, 100] as const;
export type HistoryPageSize = (typeof HISTORY_PAGE_SIZES)[number];

const PAGE_SIZE_OPTIONS = HISTORY_PAGE_SIZES.map((size) => ({
  value: String(size),
  label: String(size),
}));

export type HistoryInstanceOption = {
  value: string;
  label: string;
};

export function HistoryPager({
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

export function HistoryToolbar({
  instanceFilter,
  instanceOptions,
  eventType,
  protocol,
  pageSize,
  refreshing,
  onInstanceFilterChange,
  onEventTypeChange,
  onProtocolChange,
  onPageSizeChange,
  onRefresh,
}: {
  instanceFilter: string;
  instanceOptions: HistoryInstanceOption[];
  eventType: HistoryEventType | "all";
  protocol: HistoryProtocolFilter | "all";
  pageSize: HistoryPageSize;
  refreshing?: boolean;
  onInstanceFilterChange: (value: string) => void;
  onEventTypeChange: (value: HistoryEventType | "all") => void;
  onProtocolChange: (value: HistoryProtocolFilter | "all") => void;
  onPageSizeChange: (pageSize: HistoryPageSize) => void;
  onRefresh: () => void;
}) {
  const eventLabel =
    HISTORY_EVENT_TYPE_FILTER_OPTIONS.find((o) => o.value === eventType)?.label ?? "Event";

  return (
    <Group gap="sm" wrap="wrap" align="center" justify="space-between">
      <Select
        size="sm"
        w={200}
        allowDeselect={false}
        aria-label="Instance filter"
        data={instanceOptions}
        value={instanceFilter}
        onChange={(value) => onInstanceFilterChange(value ?? "all")}
      />

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
              if (HISTORY_PAGE_SIZES.includes(next as HistoryPageSize)) {
                onPageSizeChange(next as HistoryPageSize);
              }
            }}
          />
        </Group>
        <Menu shadow="md" width={220} position="bottom-end">
          <Menu.Target>
            <Tooltip label="Filter">
              <ActionIcon variant="default" size="lg" aria-label="Filter">
                <FunnelIcon size={18} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Event ({eventLabel})</Menu.Label>
            {HISTORY_EVENT_TYPE_FILTER_OPTIONS.map((option) => (
              <Menu.Item
                key={option.value}
                rightSection={eventType === option.value ? <CheckIcon size={14} /> : undefined}
                onClick={() => onEventTypeChange(option.value)}
              >
                {option.label}
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Label>Protocol</Menu.Label>
            {HISTORY_PROTOCOL_FILTER_OPTIONS.map((option) => (
              <Menu.Item
                key={option.value}
                rightSection={protocol === option.value ? <CheckIcon size={14} /> : undefined}
                onClick={() => onProtocolChange(option.value)}
              >
                {option.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
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
