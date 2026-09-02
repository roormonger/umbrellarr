import { Button, Group, Menu } from "@mantine/core";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { ArrowsDownUpIcon } from "@phosphor-icons/react/dist/csr/ArrowsDownUp";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretUpIcon } from "@phosphor-icons/react/dist/csr/CaretUp";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { ChecksIcon } from "@phosphor-icons/react/dist/csr/Checks";
import { FunnelIcon } from "@phosphor-icons/react/dist/csr/Funnel";
import { SquareIcon } from "@phosphor-icons/react/dist/csr/Square";
import {
  COLLECTION_FILTER_OPTIONS,
  COLLECTION_SORT_OPTIONS,
  type CollectionFilterKey,
  type CollectionSortDirection,
  type CollectionSortKey,
} from "@umbrellarr/shared";

export function CollectionsToolbar({
  sortKey,
  sortDirection,
  filterKey,
  allSelected,
  onSortChange,
  onFilterChange,
  onSelectAll,
  onClearSelection,
  onRefresh,
  refreshing,
}: {
  sortKey: CollectionSortKey;
  sortDirection: CollectionSortDirection;
  filterKey: CollectionFilterKey;
  allSelected: boolean;
  onSortChange: (key: CollectionSortKey) => void;
  onFilterChange: (key: CollectionFilterKey) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const sortLabel = COLLECTION_SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort";
  const filterLabel = COLLECTION_FILTER_OPTIONS.find((o) => o.value === filterKey)?.label ?? "Filter";

  return (
    <Group gap="sm" wrap="nowrap" align="center">
      <Button
        variant="default"
        size="sm"
        leftSection={<ArrowsClockwiseIcon />}
        loading={refreshing}
        onClick={onRefresh}
      >
        Refresh Collections
      </Button>

      {allSelected ? (
        <Button
          variant="default"
          size="sm"
          leftSection={<SquareIcon />}
          onClick={onClearSelection}
        >
          Clear
        </Button>
      ) : (
        <Button variant="default" size="sm" leftSection={<ChecksIcon />} onClick={onSelectAll}>
          Select All
        </Button>
      )}

      <Menu shadow="md" width={200} position="bottom-end">
        <Menu.Target>
          <Button
            variant="default"
            size="sm"
            leftSection={<ArrowsDownUpIcon />}
            rightSection={
              sortDirection === "asc" ? <CaretUpIcon size={14} /> : <CaretDownIcon size={14} />
            }
          >
            {sortLabel}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Sort</Menu.Label>
          {COLLECTION_SORT_OPTIONS.map((option) => (
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

      <Menu shadow="md" width={200} position="bottom-end">
        <Menu.Target>
          <Button variant="default" size="sm" leftSection={<FunnelIcon />}>
            {filterLabel}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Filter</Menu.Label>
          {COLLECTION_FILTER_OPTIONS.map((option) => (
            <Menu.Item
              key={option.value}
              rightSection={filterKey === option.value ? <CheckIcon size={14} /> : undefined}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
