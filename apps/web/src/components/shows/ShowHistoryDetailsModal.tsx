import { Anchor, Button, Group, Modal, Table, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SeriesHistoryEvent, SeriesHistoryEventType } from "@umbrellarr/shared";
import type { ReactNode } from "react";
import { markSeriesHistoryFailed } from "@/api/shows";
import { formatFreeSpace } from "@/lib/moviePath";
import classes from "../movies/MovieHistoryDetailsModal.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  instanceId: string;
  event: SeriesHistoryEvent | null;
};

type DetailEntry = {
  label: string;
  value: ReactNode;
};

/** Mirror Sonarr HistoryDetailsModal titles. */
function detailTitle(eventType: SeriesHistoryEventType): string {
  switch (eventType) {
    case "grabbed":
      return "Grabbed";
    case "downloadFailed":
      return "Download failed";
    case "downloadFolderImported":
      return "Episode Imported";
    case "episodeFileDeleted":
      return "Episode File Deleted";
    case "episodeFileRenamed":
      return "Episode File Renamed";
    case "downloadIgnored":
      return "Download Ignored";
    case "seriesFolderImported":
      return "Folder Imported";
    default:
      return "Unknown";
  }
}

/** Sonarr DeletedReason* strings with appName = Sonarr. */
function deletedReasonMessage(reason: string | undefined): string {
  switch (reason) {
    case "Manual":
      return "File was deleted using Sonarr, either manually or by another tool through the API";
    case "MissingFromDisk":
      return "Sonarr was unable to find the file on disk so the file was unlinked from the series in the database";
    case "Upgrade":
      return "File was deleted to import an upgrade";
    default:
      return reason ?? "";
  }
}

function releaseSourceLabel(source: string | undefined): string {
  switch (source) {
    case "Unknown":
      return "Unknown";
    case "Rss":
      return "RSS";
    case "Search":
      return "Search";
    case "UserInvokedSearch":
      return "User Invoked Search";
    case "InteractiveSearch":
      return "Interactive Search";
    case "ReleasePush":
      return "Release Push";
    default:
      return source ?? "";
  }
}

function formatAge(
  age: string | undefined,
  ageHours: string | undefined,
  ageMinutes: string | undefined,
): string {
  const days = Number(age);
  const hours = Number(ageHours);
  const minutes = Number(ageMinutes);
  if (Number.isFinite(days) && days >= 2) {
    return `${days} days`;
  }
  if (Number.isFinite(hours) && hours >= 2) {
    return `${hours} hours`;
  }
  if (Number.isFinite(minutes)) {
    return `${Math.max(0, Math.round(minutes))} minutes`;
  }
  if (Number.isFinite(hours)) return `${hours} hours`;
  if (Number.isFinite(days)) return `${days} days`;
  return [age, ageHours, ageMinutes].filter(Boolean).join(" / ");
}

function formatDataScore(score: string | undefined): string | null {
  if (!score || score === "0") return null;
  const n = Number(score);
  if (!Number.isFinite(n)) return score;
  return n > 0 ? `+${n}` : String(n);
}

function formatDataBytes(size: string | undefined): string | null {
  if (!size) return null;
  const n = Number(size);
  if (!Number.isFinite(n)) return size;
  return formatFreeSpace(n);
}

function hasValue(value: ReactNode): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function DetailTable({ rows }: { rows: DetailEntry[] }) {
  const visible = rows.filter((row) => hasValue(row.value));
  if (visible.length === 0) {
    return (
      <Text c="dimmed" size="sm" ta="center" py="md">
        No details for this event.
      </Text>
    );
  }

  return (
    <div className={classes.table}>
      <Table striped withColumnBorders horizontalSpacing="md" verticalSpacing="sm">
        <Table.Tbody>
          {visible.map((row) => (
            <Table.Tr key={row.label}>
              <Table.Td className={classes.labelCell}>
                <Text size="sm" fw={600} c="dimmed">
                  {row.label}
                </Text>
              </Table.Td>
              <Table.Td className={classes.valueCell}>
                <Text size="sm" component="div">
                  {row.value}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}

function detailRows(event: SeriesHistoryEvent): DetailEntry[] {
  const { eventType, sourceTitle, downloadId, data } = event;

  if (eventType === "grabbed") {
    return [
      { label: "Name", value: sourceTitle },
      { label: "Indexer", value: data.indexer },
      { label: "Release Group", value: data.releaseGroup },
      { label: "Custom Format Score", value: formatDataScore(data.customFormatScore) },
      { label: "Series Match Type", value: data.seriesMatchType },
      { label: "Release Source", value: releaseSourceLabel(data.releaseSource) },
      {
        label: "Info URL",
        value: data.nzbInfoUrl ? (
          <Anchor href={data.nzbInfoUrl} target="_blank" rel="noreferrer" size="sm">
            {data.nzbInfoUrl}
          </Anchor>
        ) : null,
      },
      { label: "Download Client", value: data.downloadClientName || data.downloadClient },
      { label: "Grab ID", value: downloadId },
      {
        label: "Age (when grabbed)",
        value:
          data.age || data.ageHours || data.ageMinutes
            ? formatAge(data.age, data.ageHours, data.ageMinutes)
            : null,
      },
      { label: "Published Date", value: data.publishedDate },
      { label: "Size", value: formatDataBytes(data.size) },
    ];
  }

  if (eventType === "downloadFailed") {
    return [
      { label: "Name", value: sourceTitle },
      { label: "Grab ID", value: downloadId },
      { label: "Indexer", value: data.indexer },
      { label: "Message", value: data.message },
    ];
  }

  if (eventType === "downloadFolderImported" || eventType === "seriesFolderImported") {
    return [
      { label: "Name", value: sourceTitle },
      { label: "Source", value: data.droppedPath },
      { label: "Imported To", value: data.importedPath },
      { label: "Custom Format Score", value: formatDataScore(data.customFormatScore) },
      { label: "File Size", value: formatDataBytes(data.size) },
    ];
  }

  if (eventType === "episodeFileDeleted") {
    return [
      { label: "Name", value: sourceTitle },
      { label: "Reason", value: deletedReasonMessage(data.reason) },
      { label: "Custom Format Score", value: formatDataScore(data.customFormatScore) },
      { label: "File Size", value: formatDataBytes(data.size) },
    ];
  }

  if (eventType === "episodeFileRenamed") {
    return [
      { label: "Source Path", value: data.sourcePath },
      { label: "Source Relative Path", value: data.sourceRelativePath },
      { label: "Destination Path", value: data.path },
      { label: "Destination Relative Path", value: data.relativePath },
    ];
  }

  if (eventType === "downloadIgnored") {
    return [
      { label: "Name", value: sourceTitle },
      { label: "Grab ID", value: downloadId },
      { label: "Message", value: data.message },
    ];
  }

  return [{ label: "Name", value: sourceTitle }];
}

export function ShowHistoryDetailsModal({ opened, onClose, instanceId, event }: Props) {
  const queryClient = useQueryClient();
  const markFailed = useMutation({
    mutationFn: () => {
      if (!event) throw new Error("No history event");
      return markSeriesHistoryFailed(instanceId, event.id);
    },
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Marked as failed" });
      await queryClient.invalidateQueries({ queryKey: ["series-history", instanceId] });
      onClose();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Mark as failed failed",
      });
    },
  });

  if (!event) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={detailTitle(event.eventType)}
      size="lg"
      centered
    >
      <DetailTable rows={detailRows(event)} />
      <Group justify="flex-end" mt="lg" gap="sm">
        {event.eventType === "grabbed" && (
          <Button
            color="red"
            variant="filled"
            loading={markFailed.isPending}
            onClick={() => markFailed.mutate()}
          >
            Mark as Failed
          </Button>
        )}
        <Button variant="default" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Modal>
  );
}
