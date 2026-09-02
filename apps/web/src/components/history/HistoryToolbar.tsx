import { Button, Group, Menu, Select } from "@mantine/core";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { FunnelIcon } from "@phosphor-icons/react/dist/csr/Funnel";
import {
  HISTORY_EVENT_TYPE_FILTER_OPTIONS,
  HISTORY_PROTOCOL_FILTER_OPTIONS,
  type HistoryEventType,
  type HistoryProtocolFilter,
} from "@umbrellarr/shared";

export type HistoryInstanceOption = {
  value: string;
  label: string;
};

export function HistoryToolbar({
  instanceFilter,
  instanceOptions,
  eventType,
  protocol,
  page,
  totalPages,
  totalRecords,
  refreshing,
  onInstanceFilterChange,
  onEventTypeChange,
  onProtocolChange,
  onRefresh,
  onPageChange,
}: {
  instanceFilter: string;
  instanceOptions: HistoryInstanceOption[];
  eventType: HistoryEventType | "all";
  protocol: HistoryProtocolFilter | "all";
  page: number;
  totalPages: number;
  totalRecords: number;
  refreshing?: boolean;
  onInstanceFilterChange: (value: string) => void;
  onEventTypeChange: (value: HistoryEventType | "all") => void;
  onProtocolChange: (value: HistoryProtocolFilter | "all") => void;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
}) {
  const eventLabel =
    HISTORY_EVENT_TYPE_FILTER_OPTIONS.find((o) => o.value === eventType)?.label ?? "Event";

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
        <Button
          variant="default"
          size="sm"
          leftSection={<ArrowsClockwiseIcon />}
          loading={refreshing}
          onClick={onRefresh}
        >
          Refresh
        </Button>
        <Menu shadow="md" width={220} position="bottom-end">
          <Menu.Target>
            <Button variant="default" size="sm" leftSection={<FunnelIcon />}>
              Filter
            </Button>
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
      </Group>

      <Group gap="xs" wrap="nowrap">
        <Button
          variant="default"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </Button>
        <Button variant="subtle" size="sm" disabled>
          {page} / {totalPages}
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
        <Button variant="subtle" size="sm" disabled>
          {totalRecords.toLocaleString()} records
        </Button>
      </Group>
    </Group>
  );
}
