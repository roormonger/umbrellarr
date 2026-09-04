import { ActionIcon, Button, Group, Menu, Select, Text, Tooltip } from "@mantine/core";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { ArrowsDownUpIcon } from "@phosphor-icons/react/dist/csr/ArrowsDownUp";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretUpIcon } from "@phosphor-icons/react/dist/csr/CaretUp";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { FunnelIcon } from "@phosphor-icons/react/dist/csr/Funnel";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import {
  INDEXER_ENABLED_FILTER_OPTIONS,
  INDEXER_PRIVACY_FILTER_OPTIONS,
  INDEXER_PROTOCOL_FILTER_OPTIONS,
  INDEXER_SORT_OPTIONS,
  type IndexerPrivacy,
  type IndexerProtocol,
  type IndexerSortKey,
} from "@umbrellarr/shared";
import { HistoryPager } from "@/components/history/HistoryToolbar";
import classes from "./IndexersToolbar.module.css";

export const INDEXER_PAGE_SIZES = [10, 25, 50, 100] as const;
export type IndexerPageSize = (typeof INDEXER_PAGE_SIZES)[number];
export type IndexerSortDirection = "asc" | "desc";
export type IndexerEnabledFilter = "all" | "enabled" | "disabled";

const PAGE_SIZE_OPTIONS = INDEXER_PAGE_SIZES.map((size) => ({
  value: String(size),
  label: String(size),
}));

export type IndexerInstanceOption = {
  value: string;
  label: string;
};

export const IndexersPager = HistoryPager;

export function IndexersToolbar({
  instanceFilter,
  instanceOptions,
  sortKey,
  sortDirection,
  protocol,
  privacy,
  enabled,
  pageSize,
  refreshing,
  addDisabled,
  onInstanceFilterChange,
  onSortChange,
  onProtocolChange,
  onPrivacyChange,
  onEnabledChange,
  onPageSizeChange,
  onRefresh,
  onAdd,
}: {
  instanceFilter: string;
  instanceOptions: IndexerInstanceOption[];
  sortKey: IndexerSortKey;
  sortDirection: IndexerSortDirection;
  protocol: IndexerProtocol | "all";
  privacy: IndexerPrivacy | "all";
  enabled: IndexerEnabledFilter;
  pageSize: IndexerPageSize;
  refreshing?: boolean;
  addDisabled?: boolean;
  onInstanceFilterChange: (value: string) => void;
  onSortChange: (key: IndexerSortKey) => void;
  onProtocolChange: (value: IndexerProtocol | "all") => void;
  onPrivacyChange: (value: IndexerPrivacy | "all") => void;
  onEnabledChange: (value: IndexerEnabledFilter) => void;
  onPageSizeChange: (pageSize: IndexerPageSize) => void;
  onRefresh: () => void;
  onAdd: () => void;
}) {
  const sortLabel = INDEXER_SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort";

  return (
    <Group gap="sm" wrap="wrap" align="center" justify="space-between">
      <Group gap="sm" wrap="nowrap" align="center">
        {instanceOptions.length > 0 ? (
          <Select
            size="sm"
            w={200}
            allowDeselect={false}
            aria-label="Instance filter"
            data={instanceOptions}
            value={instanceFilter}
            onChange={(value) => onInstanceFilterChange(value ?? instanceFilter)}
          />
        ) : null}
        <Button
          size="sm"
          leftSection={<PlusIcon size={16} weight="bold" />}
          disabled={addDisabled}
          onClick={onAdd}
        >
          Add New
        </Button>
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
              if (INDEXER_PAGE_SIZES.includes(next as IndexerPageSize)) {
                onPageSizeChange(next as IndexerPageSize);
              }
            }}
          />
        </Group>
        <Menu shadow="md" width={220} position="bottom-end">
          <Menu.Target>
            <Tooltip label={`Sort: ${sortLabel}`}>
              <ActionIcon variant="default" size="lg" aria-label="Sort">
                <ArrowsDownUpIcon size={18} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>
              Sort ({sortLabel} {sortDirection === "asc" ? "↑" : "↓"})
            </Menu.Label>
            {INDEXER_SORT_OPTIONS.map((option) => (
              <Menu.Item
                key={option.value}
                rightSection={
                  sortKey === option.value ? (
                    sortDirection === "asc" ? (
                      <CaretUpIcon size={14} />
                    ) : (
                      <CaretDownIcon size={14} />
                    )
                  ) : undefined
                }
                onClick={() => onSortChange(option.value)}
              >
                {option.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
        <Menu shadow="md" width={220} position="bottom-end">
          <Menu.Target>
            <Tooltip label="Filter">
              <ActionIcon variant="default" size="lg" aria-label="Filter">
                <FunnelIcon size={18} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Protocol</Menu.Label>
            {INDEXER_PROTOCOL_FILTER_OPTIONS.map((option) => (
              <Menu.Item
                key={option.value}
                rightSection={protocol === option.value ? <CheckIcon size={14} /> : undefined}
                onClick={() => onProtocolChange(option.value)}
              >
                {option.label}
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Label>Privacy</Menu.Label>
            {INDEXER_PRIVACY_FILTER_OPTIONS.map((option) => (
              <Menu.Item
                key={option.value}
                rightSection={privacy === option.value ? <CheckIcon size={14} /> : undefined}
                onClick={() => onPrivacyChange(option.value)}
              >
                {option.label}
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Label>Enabled</Menu.Label>
            {INDEXER_ENABLED_FILTER_OPTIONS.map((option) => (
              <Menu.Item
                key={option.value}
                rightSection={enabled === option.value ? <CheckIcon size={14} /> : undefined}
                onClick={() => onEnabledChange(option.value)}
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
