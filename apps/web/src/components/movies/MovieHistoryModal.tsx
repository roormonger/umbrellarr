import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownIcon } from "@phosphor-icons/react/dist/csr/ArrowDown";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/csr/ArrowsLeftRight";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { FileArrowDownIcon } from "@phosphor-icons/react/dist/csr/FileArrowDown";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import { ProhibitIcon } from "@phosphor-icons/react/dist/csr/Prohibit";
import { QuestionIcon } from "@phosphor-icons/react/dist/csr/Question";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { TrophyIcon } from "@phosphor-icons/react/dist/csr/Trophy";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import type { MovieHistoryEvent, MovieHistoryEventType } from "@umbrellarr/shared";
import { useState, type ReactNode } from "react";
import { getMovieHistory } from "@/api/movies";
import { MovieHistoryDetailsModal } from "@/components/movies/MovieHistoryDetailsModal";

type Props = {
  opened: boolean;
  onClose: () => void;
  instanceId: string;
  movieId: number;
};

const eventMeta: Record<
  MovieHistoryEventType,
  { label: string; icon: ReactNode; color: string }
> = {
  grabbed: {
    label: "Grabbed",
    icon: <DownloadSimpleIcon size={16} />,
    color: "violet",
  },
  downloadFolderImported: {
    label: "Imported",
    icon: <FileArrowDownIcon size={16} />,
    color: "teal",
  },
  movieFolderImported: {
    label: "Folder imported",
    icon: <ArrowDownIcon size={16} />,
    color: "teal",
  },
  downloadFailed: {
    label: "Download failed",
    icon: <WarningCircleIcon size={16} />,
    color: "red",
  },
  movieFileDeleted: {
    label: "File deleted",
    icon: <TrashIcon size={16} />,
    color: "orange",
  },
  movieFileRenamed: {
    label: "Renamed",
    icon: <ArrowsLeftRightIcon size={16} />,
    color: "blue",
  },
  downloadIgnored: {
    label: "Ignored",
    icon: <ProhibitIcon size={16} />,
    color: "gray",
  },
  unknown: {
    label: "Unknown",
    icon: <QuestionIcon size={16} />,
    color: "gray",
  },
};

function formatHistoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  const timePart = date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
    .replace(/\s/g, "")
    .toLowerCase();
  // Match Radarr: "Jan 21 2026 10:49:06am"
  return `${month} ${day} ${year} ${timePart}`;
}

function formatScore(score?: number): string {
  if (score == null) return "—";
  return score > 0 ? `+${score}` : String(score);
}

function HistoryRow({
  event,
  onDetails,
}: {
  event: MovieHistoryEvent;
  onDetails: (event: MovieHistoryEvent) => void;
}) {
  const meta = eventMeta[event.eventType] ?? eventMeta.unknown;

  return (
    <Table.Tr>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <Tooltip label={meta.label} withArrow>
            <Text c={meta.color} style={{ display: "inline-flex", flexShrink: 0 }}>
              {meta.icon}
            </Text>
          </Tooltip>
          <Text size="sm" style={{ wordBreak: "break-all" }}>
            {event.sourceTitle || "—"}
          </Text>
        </Group>
      </Table.Td>
      <Table.Td>
        {event.languages.length > 0
          ? event.languages.map((lang) => (
              <Badge key={lang} size="xs" mr={4} variant="light">
                {lang}
              </Badge>
            ))
          : "—"}
      </Table.Td>
      <Table.Td>
        <Text size="sm">{event.quality ?? "Unknown"}</Text>
      </Table.Td>
      <Table.Td>
        {event.customFormats.length > 0
          ? event.customFormats.map((fmt) => (
              <Badge key={fmt} size="xs" mr={4} color="violet" variant="light">
                {fmt}
              </Badge>
            ))
          : "—"}
      </Table.Td>
      <Table.Td ta="center">
        <Text size="sm">{formatScore(event.customFormatScore)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" style={{ whiteSpace: "nowrap" }}>
          {formatHistoryDate(event.date)}
        </Text>
      </Table.Td>
      <Table.Td w={48}>
        <Tooltip label="Details" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            aria-label="History details"
            onClick={() => onDetails(event)}
          >
            <InfoIcon size={16} />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  );
}

export function MovieHistoryModal({ opened, onClose, instanceId, movieId }: Props) {
  const [detailsEvent, setDetailsEvent] = useState<MovieHistoryEvent | null>(null);

  const historyQuery = useQuery({
    queryKey: ["movie-history", instanceId, movieId],
    queryFn: () => getMovieHistory(instanceId, movieId),
    enabled: opened,
  });

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title="History"
        size="90%"
        centered
        styles={{
          content: { maxWidth: 1100 },
        }}
      >
        {historyQuery.isLoading && (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        )}

        {historyQuery.error && (
          <Text c="red" size="sm">
            {historyQuery.error instanceof Error
              ? historyQuery.error.message
              : "Failed to load history"}
          </Text>
        )}

        {historyQuery.data && historyQuery.data.events.length === 0 && (
          <Text c="dimmed" size="sm" ta="center" py="xl">
            No history for this movie.
          </Text>
        )}

        {historyQuery.data && historyQuery.data.events.length > 0 && (
          <ScrollArea.Autosize mah="70vh" type="auto" offsetScrollbars>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Source Title</Table.Th>
                  <Table.Th w={110}>Languages</Table.Th>
                  <Table.Th w={110}>Quality</Table.Th>
                  <Table.Th w={180}>Custom Formats</Table.Th>
                  <Table.Th w={56} ta="center">
                    <Tooltip label="Custom format score" withArrow>
                      <Text
                        component="span"
                        c="dimmed"
                        style={{ display: "inline-flex", verticalAlign: "middle" }}
                      >
                        <TrophyIcon size={16} />
                      </Text>
                    </Tooltip>
                  </Table.Th>
                  <Table.Th w={170}>Date</Table.Th>
                  <Table.Th w={48} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {historyQuery.data.events.map((event) => (
                  <HistoryRow
                    key={event.id}
                    event={event}
                    onDetails={setDetailsEvent}
                  />
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Modal>

      <MovieHistoryDetailsModal
        opened={detailsEvent != null}
        onClose={() => setDetailsEvent(null)}
        instanceId={instanceId}
        event={detailsEvent}
      />
    </>
  );
}
