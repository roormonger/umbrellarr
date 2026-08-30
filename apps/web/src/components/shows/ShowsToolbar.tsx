import { Box, Button, Group, Menu, Slider, Tooltip } from "@mantine/core";
import { ArrowsDownUpIcon } from "@phosphor-icons/react/dist/csr/ArrowsDownUp";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretUpIcon } from "@phosphor-icons/react/dist/csr/CaretUp";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { FunnelIcon } from "@phosphor-icons/react/dist/csr/Funnel";
import { MagnifyingGlassMinusIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlassMinus";
import { MagnifyingGlassPlusIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlassPlus";
import {
  SERIES_FILTER_OPTIONS,
  SERIES_SORT_OPTIONS,
  type SeriesFilterKey,
  type SeriesSortDirection,
  type SeriesSortKey,
} from "@umbrellarr/shared";
import { LibraryRefreshButton } from "@/components/media/LibraryRefreshButton";

export const POSTER_SIZE_MIN = 90;
export const POSTER_SIZE_MAX = 220;
export const POSTER_SIZE_DEFAULT = 140;

export function ShowsToolbar({
  posterSize,
  sortKey,
  sortDirection,
  filterKey,
  onPosterSizeChange,
  onPosterSizeCommit,
  onSortChange,
  onFilterChange,
  onRefresh,
  refreshing,
}: {
  posterSize: number;
  sortKey: SeriesSortKey;
  sortDirection: SeriesSortDirection;
  filterKey: SeriesFilterKey;
  onPosterSizeChange: (size: number) => void;
  onPosterSizeCommit: (size: number) => void;
  onSortChange: (key: SeriesSortKey) => void;
  onFilterChange: (key: SeriesFilterKey) => void;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const sortLabel = SERIES_SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort";
  const filterLabel = SERIES_FILTER_OPTIONS.find((o) => o.value === filterKey)?.label ?? "Filter";

  return (
    <Group gap="sm" wrap="nowrap" align="center">
      <Tooltip label="Poster size" withArrow>
        <Group gap={6} wrap="nowrap" align="center">
          <MagnifyingGlassMinusIcon size={16} />
          <Box w={120}>
            <Slider
              size="sm"
              min={POSTER_SIZE_MIN}
              max={POSTER_SIZE_MAX}
              step={1}
              value={posterSize}
              onChange={onPosterSizeChange}
              onChangeEnd={onPosterSizeCommit}
              label={null}
              aria-label="Poster size"
            />
          </Box>
          <MagnifyingGlassPlusIcon size={16} />
        </Group>
      </Tooltip>

      <Menu shadow="md" width={220} position="bottom-end">
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
        <Menu.Dropdown mah={360} style={{ overflowY: "auto" }}>
          <Menu.Label>Sort</Menu.Label>
          {SERIES_SORT_OPTIONS.map((option) => (
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
          {SERIES_FILTER_OPTIONS.map((option) => (
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

      <LibraryRefreshButton loading={refreshing} onRefresh={onRefresh} />
    </Group>
  );
}
