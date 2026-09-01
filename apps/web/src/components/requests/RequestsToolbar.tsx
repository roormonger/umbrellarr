import { Button, Group, Menu } from "@mantine/core";
import { ArrowsDownUpIcon } from "@phosphor-icons/react/dist/csr/ArrowsDownUp";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { FilmStripIcon } from "@phosphor-icons/react/dist/csr/FilmStrip";
import { FunnelIcon } from "@phosphor-icons/react/dist/csr/Funnel";
import type { RequestFilter, RequestSort, RequestSortDirection } from "@umbrellarr/shared";

const TYPE_OPTIONS = [
  { value: "all" as const, label: "All" },
  { value: "movie" as const, label: "Movies" },
  { value: "tv" as const, label: "Series" },
];

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

const SORT_OPTIONS = [
  { value: "recent" as const, label: "Most Recent" },
  { value: "oldest" as const, label: "Oldest" },
  { value: "modified" as const, label: "Recently Modified" },
];

export type RequestSortPreset = "recent" | "oldest" | "modified";

export function requestSortPreset(
  sort: RequestSort,
  sortDirection: RequestSortDirection,
): RequestSortPreset {
  if (sort === "modified" && sortDirection === "desc") return "modified";
  if (sort === "added" && sortDirection === "asc") return "oldest";
  return "recent";
}

export function RequestsToolbar({
  mediaType,
  filter,
  sortPreset,
  onMediaTypeChange,
  onFilterChange,
  onSortPresetChange,
}: {
  mediaType: "all" | "movie" | "tv";
  filter: RequestFilter;
  sortPreset: RequestSortPreset;
  onMediaTypeChange: (value: "all" | "movie" | "tv") => void;
  onFilterChange: (value: RequestFilter) => void;
  onSortPresetChange: (value: RequestSortPreset) => void;
}) {
  const typeLabel = TYPE_OPTIONS.find((o) => o.value === mediaType)?.label ?? "Type";
  const filterLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "Filter";
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortPreset)?.label ?? "Sort";

  return (
    <Group gap="sm" wrap="nowrap" align="center">
      <Menu shadow="md" width={180} position="bottom-end">
        <Menu.Target>
          <Button variant="default" size="sm" leftSection={<FilmStripIcon />}>
            {typeLabel}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Type</Menu.Label>
          {TYPE_OPTIONS.map((option) => (
            <Menu.Item
              key={option.value}
              rightSection={mediaType === option.value ? <CheckIcon size={14} /> : undefined}
              onClick={() => onMediaTypeChange(option.value)}
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
          {FILTER_OPTIONS.map((option) => (
            <Menu.Item
              key={option.value}
              rightSection={filter === option.value ? <CheckIcon size={14} /> : undefined}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>

      <Menu shadow="md" width={220} position="bottom-end">
        <Menu.Target>
          <Button variant="default" size="sm" leftSection={<ArrowsDownUpIcon />}>
            {sortLabel}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Sort</Menu.Label>
          {SORT_OPTIONS.map((option) => (
            <Menu.Item
              key={option.value}
              rightSection={sortPreset === option.value ? <CheckIcon size={14} /> : undefined}
              onClick={() => onSortPresetChange(option.value)}
            >
              {option.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
