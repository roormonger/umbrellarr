import { Button, Group, Menu } from "@mantine/core";
import { ArrowsDownUpIcon } from "@phosphor-icons/react/dist/csr/ArrowsDownUp";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { FunnelIcon } from "@phosphor-icons/react/dist/csr/Funnel";
import type { IssueFilter, IssueSort, RequestSortDirection } from "@umbrellarr/shared";

const FILTER_OPTIONS: { value: IssueFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

const SORT_OPTIONS = [
  { value: "recent" as const, label: "Most Recent" },
  { value: "oldest" as const, label: "Oldest" },
  { value: "modified" as const, label: "Recently Modified" },
];

export type IssueSortPreset = "recent" | "oldest" | "modified";

export function issueSortPreset(
  sort: IssueSort,
  sortDirection: RequestSortDirection,
): IssueSortPreset {
  if (sort === "modified" && sortDirection === "desc") return "modified";
  if (sort === "added" && sortDirection === "asc") return "oldest";
  return "recent";
}

export function IssuesToolbar({
  filter,
  sortPreset,
  onFilterChange,
  onSortPresetChange,
}: {
  filter: IssueFilter;
  sortPreset: IssueSortPreset;
  onFilterChange: (value: IssueFilter) => void;
  onSortPresetChange: (value: IssueSortPreset) => void;
}) {
  const filterLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "Filter";
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortPreset)?.label ?? "Sort";

  return (
    <Group gap="sm" wrap="nowrap" align="center">
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
