import { Anchor, Button, Group, Modal, Table, Text } from "@mantine/core";
import type { ArrKind, HistoryEventType, HistoryKind, HistoryListItem } from "@umbrellarr/shared";
import type { ReactNode } from "react";
import {
  formatElapsedMs,
  formatHistoryDateTime,
  historyEventLabel,
} from "@/lib/historyDisplay";
import { formatFreeSpace } from "@/lib/moviePath";
import classes from "../movies/MovieHistoryDetailsModal.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  item: HistoryListItem | null;
};

type DetailEntry = {
  label: string;
  value: ReactNode;
};

function detailTitle(eventType: HistoryEventType, kind: HistoryKind): string {
  if (kind === "prowlarr") return historyEventLabel(eventType, kind);
  if (eventType === "grabbed") return "Grabbed";
  if (eventType === "downloadFailed") return "Download failed";
  if (eventType === "downloadIgnored") return "Download Ignored";
  if (eventType === "downloadFolderImported") {
    return kind === "sonarr" ? "Episode Imported" : "Movie Imported";
  }
  if (eventType === "movieFolderImported" || eventType === "seriesFolderImported") {
    return "Folder Imported";
  }
  if (eventType === "trackFileImported") return "Track Imported";
  if (eventType === "albumFolderImported") return "Album Folder Imported";
  if (eventType === "artistFolderImported") return "Artist Folder Imported";
  if (
    eventType === "movieFileDeleted" ||
    eventType === "episodeFileDeleted" ||
    eventType === "trackFileDeleted"
  ) {
    return "File Deleted";
  }
  if (
    eventType === "movieFileRenamed" ||
    eventType === "episodeFileRenamed" ||
    eventType === "trackFileRenamed"
  ) {
    return "File Renamed";
  }
  if (eventType === "trackFileRetagged") return "Track File Retagged";
  return "Unknown";
}

function deletedReasonMessage(reason: string | undefined, kind: ArrKind): string {
  const app = kind === "radarr" ? "Radarr" : kind === "sonarr" ? "Sonarr" : "Lidarr";
  switch (reason) {
    case "Manual":
      return `File was deleted using ${app}, either manually or by another tool through the API`;
    case "MissingFromDisk":
      return `${app} was unable to find the file on disk so the file was unlinked in the database`;
    case "Upgrade":
      return "File was deleted to import an upgrade";
    default:
      return reason ?? "";
  }
}

function releaseSourceLabel(source: string | undefined): string {
  switch (source) {
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
    case "Unknown":
      return "Unknown";
    default:
      return source ?? "";
  }
}

function formatAge(age?: string, ageHours?: string, ageMinutes?: string): string {
  const days = Number(age);
  const hours = Number(ageHours);
  const minutes = Number(ageMinutes);
  if (Number.isFinite(days) && days >= 2) return `${days} days`;
  if (Number.isFinite(hours) && hours >= 2) return `${hours} hours`;
  if (Number.isFinite(minutes)) return `${Math.max(0, Math.round(minutes))} minutes`;
  if (Number.isFinite(hours)) return `${hours} hours`;
  if (Number.isFinite(days)) return `${days} days`;
  return [age, ageHours, ageMinutes].filter(Boolean).join(" / ");
}

function formatDataScore(score?: string): string | null {
  if (!score || score === "0") return null;
  const n = Number(score);
  if (!Number.isFinite(n)) return score;
  return n > 0 ? `+${n}` : String(n);
}

function formatDataBytes(size?: string): string | null {
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

function dash(value?: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "-";
}

function prowlarrDetailRows(item: HistoryListItem): DetailEntry[] {
  const { data, sourceTitle, indexerName, date } = item;
  const query = sourceTitle || data.query;
  const url = data.url || data.nzbInfoUrl;
  return [
    { label: "Query", value: dash(query) },
    { label: "Indexer", value: dash(indexerName || data.indexer) },
    {
      label: "Query Results",
      value: dash(data.queryResults || data.results || data.numberOfResults),
    },
    { label: "Categories", value: dash(data.categories || data.category) },
    { label: "Limit", value: dash(data.limit) },
    { label: "Offset", value: dash(data.offset) },
    { label: "Source", value: dash(data.source) },
    { label: "Host", value: dash(data.host) },
    {
      label: "Url",
      value: url ? (
        <Anchor href={url} target="_blank" rel="noreferrer" size="sm">
          Link
        </Anchor>
      ) : (
        "-"
      ),
    },
    {
      label: "Elapsed Time",
      value: data.elapsedTime ? formatElapsedMs(data.elapsedTime) : "-",
    },
    { label: "Date", value: date ? formatHistoryDateTime(date) : "-" },
  ];
}

function detailRows(item: HistoryListItem): DetailEntry[] {
  if (item.kind === "prowlarr") return prowlarrDetailRows(item);

  const { eventType, sourceTitle, downloadId, data, kind } = item;

  if (eventType === "grabbed") {
    return [
      { label: "Name", value: sourceTitle },
      { label: "Indexer", value: data.indexer },
      { label: "Release Group", value: data.releaseGroup },
      { label: "Custom Format Score", value: formatDataScore(data.customFormatScore) },
      { label: "Match Type", value: data.movieMatchType ?? data.seriesMatchType },
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

  if (
    eventType === "downloadFolderImported" ||
    eventType === "movieFolderImported" ||
    eventType === "seriesFolderImported" ||
    eventType === "trackFileImported" ||
    eventType === "albumFolderImported" ||
    eventType === "artistFolderImported"
  ) {
    return [
      { label: "Name", value: sourceTitle },
      { label: "Source", value: data.droppedPath },
      { label: "Imported To", value: data.importedPath },
      { label: "Custom Format Score", value: formatDataScore(data.customFormatScore) },
      { label: "File Size", value: formatDataBytes(data.size) },
    ];
  }

  if (
    eventType === "movieFileDeleted" ||
    eventType === "episodeFileDeleted" ||
    eventType === "trackFileDeleted"
  ) {
    return [
      { label: "Name", value: sourceTitle },
      { label: "Reason", value: deletedReasonMessage(data.reason, kind as ArrKind) },
      { label: "Custom Format Score", value: formatDataScore(data.customFormatScore) },
      { label: "File Size", value: formatDataBytes(data.size) },
    ];
  }

  if (
    eventType === "movieFileRenamed" ||
    eventType === "episodeFileRenamed" ||
    eventType === "trackFileRenamed" ||
    eventType === "trackFileRetagged"
  ) {
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

export function HistoryDetailsModal({ opened, onClose, item }: Props) {
  if (!item) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={detailTitle(item.eventType, item.kind)}
      size="lg"
      centered
    >
      <DetailTable rows={detailRows(item)} />
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Modal>
  );
}
