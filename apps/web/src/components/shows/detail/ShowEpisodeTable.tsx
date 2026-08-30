import { ActionIcon, Table, Text, Tooltip } from "@mantine/core";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { ListMagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/ListMagnifyingGlass";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { ProhibitIcon } from "@phosphor-icons/react/dist/csr/Prohibit";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import type { SeriesEpisode, SeriesEpisodeStatus } from "@umbrellarr/shared";
import type { Icon } from "@phosphor-icons/react";
import classes from "./ShowSeasonsPanel.module.css";

const STATUS_META: Record<
  SeriesEpisodeStatus,
  { label: string; color: string; icon: Icon }
> = {
  downloading: { label: "Downloading", color: "violet", icon: DownloadSimpleIcon },
  downloaded: { label: "Downloaded", color: "teal", icon: CheckIcon },
  missing: { label: "Missing", color: "red", icon: WarningCircleIcon },
  unaired: { label: "Unaired", color: "blue", icon: ClockCounterClockwiseIcon },
  unmonitored: { label: "Unmonitored", color: "gray", icon: ProhibitIcon },
};

function formatAirDate(value?: string): string {
  if (!value) return "TBA";
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Props = {
  episodes: SeriesEpisode[];
  searchingEpisodeId?: number;
  onSearch: (episode: SeriesEpisode) => void;
  onInteractiveSearch: (episode: SeriesEpisode) => void;
};

export function ShowEpisodeTable({
  episodes,
  searchingEpisodeId,
  onSearch,
  onInteractiveSearch,
}: Props) {
  if (episodes.length === 0) {
    return (
      <Text size="sm" c="dimmed" className={classes.empty}>
        No episodes in this season.
      </Text>
    );
  }

  return (
    <Table striped highlightOnHover horizontalSpacing="sm" verticalSpacing={6}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={48}>#</Table.Th>
          <Table.Th>Title</Table.Th>
          <Table.Th w={140}>Air Date</Table.Th>
          <Table.Th w={56} ta="center">
            Status
          </Table.Th>
          <Table.Th w={84} />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {episodes.map((episode) => {
          const meta = STATUS_META[episode.status];
          const Icon = meta.icon;
          return (
            <Table.Tr key={episode.id}>
              <Table.Td>
                <Text size="sm" ff="monospace">
                  {episode.episodeNumber}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{episode.title || "TBA"}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {formatAirDate(episode.airDate)}
                </Text>
              </Table.Td>
              <Table.Td ta="center">
                <Tooltip label={meta.label} withArrow>
                  <span className={classes.status} aria-label={meta.label}>
                    <Text c={meta.color} style={{ display: "inline-flex" }}>
                      <Icon size={18} weight="fill" />
                    </Text>
                  </span>
                </Tooltip>
              </Table.Td>
              <Table.Td>
                <div className={classes.epActions}>
                  <Tooltip label="Search" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label={`Search episode ${episode.episodeNumber}`}
                      loading={searchingEpisodeId === episode.id}
                      onClick={() => onSearch(episode)}
                    >
                      <MagnifyingGlassIcon size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Interactive Search" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label={`Interactive search episode ${episode.episodeNumber}`}
                      onClick={() => onInteractiveSearch(episode)}
                    >
                      <ListMagnifyingGlassIcon size={16} />
                    </ActionIcon>
                  </Tooltip>
                </div>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
