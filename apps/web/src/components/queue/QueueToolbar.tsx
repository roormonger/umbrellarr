import { Button, Group, Menu, Select, Switch } from "@mantine/core";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { FunnelIcon } from "@phosphor-icons/react/dist/csr/Funnel";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import {
  QUEUE_PROTOCOL_FILTER_OPTIONS,
  QUEUE_STATUS_FILTER_OPTIONS,
  type QueueProtocol,
  type QueueStatusFilter,
} from "@umbrellarr/shared";

export type QueueInstanceOption = {
  value: string;
  label: string;
};

export function QueueToolbar({
  instanceFilter,
  instanceOptions,
  includeUnknown,
  protocol,
  status,
  selectedCount,
  grabEnabled,
  removeEnabled,
  showStatusFilter,
  refreshing,
  onInstanceFilterChange,
  onIncludeUnknownChange,
  onProtocolChange,
  onStatusChange,
  onRefresh,
  onGrabSelected,
  onRemoveSelected,
}: {
  instanceFilter: string;
  instanceOptions: QueueInstanceOption[];
  includeUnknown: boolean;
  protocol: QueueProtocol | "all";
  status: QueueStatusFilter;
  selectedCount: number;
  grabEnabled: boolean;
  removeEnabled: boolean;
  showStatusFilter: boolean;
  refreshing?: boolean;
  onInstanceFilterChange: (value: string) => void;
  onIncludeUnknownChange: (value: boolean) => void;
  onProtocolChange: (value: QueueProtocol | "all") => void;
  onStatusChange: (value: QueueStatusFilter) => void;
  onRefresh: () => void;
  onGrabSelected: () => void;
  onRemoveSelected: () => void;
}) {
  const statusLabel =
    QUEUE_STATUS_FILTER_OPTIONS.find((o) => o.value === status)?.label ?? "Status";
  const unknownLabel = includeUnknown ? "Show unknown items" : "Hide unknown items";

  return (
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
      <Button
        variant="default"
        size="sm"
        leftSection={<DownloadSimpleIcon />}
        disabled={!grabEnabled}
        onClick={onGrabSelected}
      >
        Grab Selected{selectedCount > 0 ? ` (${selectedCount})` : ""}
      </Button>
      <Button
        variant="default"
        size="sm"
        leftSection={<TrashIcon />}
        disabled={!removeEnabled}
        onClick={onRemoveSelected}
      >
        Remove Selected{selectedCount > 0 ? ` (${selectedCount})` : ""}
      </Button>

      <Menu shadow="md" width={260} position="bottom-end">
        <Menu.Target>
          <Button variant="default" size="sm" leftSection={<GearSixIcon />}>
            Options
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Options</Menu.Label>
          <Menu.Item closeMenuOnClick={false}>
            <Switch
              label={unknownLabel}
              checked={includeUnknown}
              onChange={(e) => onIncludeUnknownChange(e.currentTarget.checked)}
            />
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Menu shadow="md" width={200} position="bottom-end">
        <Menu.Target>
          <Button variant="default" size="sm" leftSection={<FunnelIcon />}>
            Filter
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Protocol</Menu.Label>
          {QUEUE_PROTOCOL_FILTER_OPTIONS.map((option) => (
            <Menu.Item
              key={option.value}
              rightSection={protocol === option.value ? <CheckIcon size={14} /> : undefined}
              onClick={() => onProtocolChange(option.value)}
            >
              {option.label}
            </Menu.Item>
          ))}
          {showStatusFilter ? (
            <>
              <Menu.Divider />
              <Menu.Label>Status ({statusLabel})</Menu.Label>
              {QUEUE_STATUS_FILTER_OPTIONS.map((option) => (
                <Menu.Item
                  key={option.value}
                  rightSection={status === option.value ? <CheckIcon size={14} /> : undefined}
                  onClick={() => onStatusChange(option.value)}
                >
                  {option.label}
                </Menu.Item>
              ))}
            </>
          ) : null}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
