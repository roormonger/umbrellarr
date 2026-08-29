import {
  ActionIcon,
  Anchor,
  Badge,
  Divider,
  HoverCard,
  ScrollArea,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import { ArrowFatLinesDownIcon } from "@phosphor-icons/react/dist/csr/ArrowFatLinesDown";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { ProhibitIcon } from "@phosphor-icons/react/dist/csr/Prohibit";
import { TrophyIcon } from "@phosphor-icons/react/dist/csr/Trophy";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import type {
  SeriesBlocklistItem,
  SeriesHistoryEvent,
  SeriesRelease,
  SeriesReleaseLanguage,
} from "@umbrellarr/shared";
import { useMemo, useState } from "react";
import { grabSeriesRelease } from "@/api/shows";
import { formatFreeSpace } from "@/lib/moviePath";
import classes from "../movies/MovieInteractiveSearchModal.module.css";

type GrabState = "idle" | "grabbing" | "grabbed" | "error";

type Props = {
  instanceId: string;
  seriesId: number;
  releases: SeriesRelease[];
  history: SeriesHistoryEvent[];
  blocklist: SeriesBlocklistItem[];
};

function formatAge(age: number, ageHours: number, ageMinutes: number): string {
  if (age >= 2) return `${Math.round(age)} days`;
  if (ageHours >= 2) return `${Math.round(ageHours)} hours`;
  return `${Math.max(0, Math.round(ageMinutes))} minutes`;
}

function formatScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

function formatHistoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function LanguagesCell({ languages }: { languages: SeriesReleaseLanguage[] }) {
  if (languages.length === 0) return "—";
  if (languages.length === 1) {
    return (
      <Badge size="xs" variant="light">
        {languages[0]?.name}
      </Badge>
    );
  }
  return (
    <HoverCard
      width={200}
      position="bottom-start"
      withArrow
      shadow="md"
      openDelay={80}
      closeDelay={50}
      withinPortal
    >
      <HoverCard.Target>
        <span style={{ display: "inline-flex", cursor: "default" }}>
          <Badge size="xs" variant="light">
            Multi-Language
          </Badge>
        </span>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Text fw={600} size="sm">
          Languages
        </Text>
        <Divider my="xs" />
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          {languages.map((lang) => (
            <li key={lang.id}>
              <Text size="sm">{lang.name}</Text>
            </li>
          ))}
        </ul>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

function ProtocolBadge({ protocol }: { protocol: SeriesRelease["protocol"] }) {
  if (protocol === "usenet") {
    return (
      <Badge size="xs" color="blue" variant="filled" className={classes.protocolUsenet}>
        nzb
      </Badge>
    );
  }
  if (protocol === "torrent") {
    return (
      <Badge size="xs" color="teal" variant="filled" className={classes.protocolTorrent}>
        torrent
      </Badge>
    );
  }
  return (
    <Badge size="xs" color="gray" variant="light">
      unknown
    </Badge>
  );
}

function RejectionPopover({ rejections }: { rejections: string[] }) {
  if (rejections.length === 0) return null;
  return (
    <HoverCard
      width={320}
      position="left"
      withArrow
      shadow="md"
      openDelay={80}
      closeDelay={50}
      withinPortal
    >
      <HoverCard.Target>
        <ActionIcon variant="subtle" color="red" size="sm" aria-label="Release rejected">
          <WarningCircleIcon size={16} weight="fill" />
        </ActionIcon>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Text fw={600} size="sm" mb={6}>
          Release Rejected
        </Text>
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          {rejections.map((reason) => (
            <li key={reason}>
              <Text size="sm">{reason}</Text>
            </li>
          ))}
        </ul>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

function FlagsPopover({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;
  return (
    <HoverCard
      width={240}
      position="left"
      withArrow
      shadow="md"
      openDelay={80}
      closeDelay={50}
      withinPortal
    >
      <HoverCard.Target>
        <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Indexer flags">
          <FlagIcon size={16} />
        </ActionIcon>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Text fw={600} size="sm" mb={6}>
          Indexer Flags
        </Text>
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          {flags.map((flag) => (
            <li key={flag}>
              <Text size="sm">{flag}</Text>
            </li>
          ))}
        </ul>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

function HistoryCell({
  release,
  history,
  blocklist,
}: {
  release: SeriesRelease;
  history: SeriesHistoryEvent[];
  blocklist: SeriesBlocklistItem[];
}) {
  const grabbed = history.find(
    (e) => e.eventType === "grabbed" && e.data.guid === release.guid,
  );
  const failed = grabbed
    ? history.find(
        (e) => e.eventType === "downloadFailed" && e.sourceTitle === grabbed.sourceTitle,
      )
    : undefined;
  const blocked = grabbed
    ? blocklist.find((b) => b.sourceTitle === grabbed.sourceTitle)
    : undefined;

  if (!grabbed && !failed && !blocked) return null;

  return (
    <span className={classes.historyIcons}>
      {grabbed && !failed && (
        <Tooltip label={`Grabbed ${formatHistoryDate(grabbed.date)}`} withArrow>
          <Text c="gray" style={{ display: "inline-flex" }}>
            <DownloadSimpleIcon size={14} />
          </Text>
        </Tooltip>
      )}
      {failed && (
        <Tooltip label={`Failed ${formatHistoryDate(failed.date)}`} withArrow>
          <Text c="red" style={{ display: "inline-flex" }}>
            <WarningCircleIcon size={14} />
          </Text>
        </Tooltip>
      )}
      {blocked && (
        <Tooltip label={`Blocklisted ${formatHistoryDate(blocked.date)}`} withArrow>
          <Text c="orange" style={{ display: "inline-flex" }}>
            <ProhibitIcon size={14} />
          </Text>
        </Tooltip>
      )}
    </span>
  );
}

function ReleaseRow({
  release,
  instanceId,
  seriesId,
  history,
  blocklist,
}: {
  release: SeriesRelease;
  instanceId: string;
  seriesId: number;
  history: SeriesHistoryEvent[];
  blocklist: SeriesBlocklistItem[];
}) {
  const [grabState, setGrabState] = useState<GrabState>("idle");
  const [overrideState, setOverrideState] = useState<GrabState>("idle");
  const [grabError, setGrabError] = useState<string | null>(null);

  const grabMutation = useMutation({
    mutationFn: (override: boolean) => {
      if (override) {
        if (!release.quality) {
          throw new Error("Release has no quality for override grab");
        }
        return grabSeriesRelease(instanceId, {
          guid: release.guid,
          indexerId: release.indexerId,
          seriesId,
          shouldOverride: true,
          quality: release.quality,
          languages: release.languages,
        });
      }
      return grabSeriesRelease(instanceId, {
        guid: release.guid,
        indexerId: release.indexerId,
        seriesId: release.downloadAllowed ? undefined : seriesId,
      });
    },
    onMutate: (override) => {
      setGrabError(null);
      if (override) setOverrideState("grabbing");
      else setGrabState("grabbing");
    },
    onSuccess: (_data, override) => {
      if (override) setOverrideState("grabbed");
      else setGrabState("grabbed");
      notifications.show({
        color: "green",
        message: override ? "Override grab sent to Sonarr" : "Release added to download queue",
      });
    },
    onError: (error, override) => {
      const message = error instanceof Error ? error.message : "Grab failed";
      setGrabError(message);
      if (override) setOverrideState("error");
      else setGrabState("error");
      notifications.show({ color: "red", title: "Grab failed", message });
    },
  });

  const peers =
    release.protocol === "torrent" && (release.seeders != null || release.leechers != null)
      ? `${release.seeders ?? 0} / ${release.leechers ?? 0}`
      : null;

  const peersColor =
    (release.seeders ?? 0) >= 50 ? "blue" : (release.seeders ?? 0) > 0 ? "yellow" : "gray";

  return (
    <Table.Tr>
      <Table.Td>
        <ProtocolBadge protocol={release.protocol} />
      </Table.Td>
      <Table.Td>
        <Tooltip
          label={release.publishDate ? new Date(release.publishDate).toLocaleString() : "Age"}
          withArrow
        >
          <Text size="sm" style={{ whiteSpace: "nowrap" }}>
            {formatAge(release.age, release.ageHours, release.ageMinutes)}
          </Text>
        </Tooltip>
      </Table.Td>
      <Table.Td>
        {release.infoUrl ? (
          <Anchor
            href={release.infoUrl}
            target="_blank"
            rel="noreferrer"
            size="sm"
            className={classes.titleLink}
          >
            {release.title}
          </Anchor>
        ) : (
          <Text size="sm" className={classes.titleLink}>
            {release.title}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm">{release.indexer || "—"}</Text>
      </Table.Td>
      <Table.Td>
        <HistoryCell release={release} history={history} blocklist={blocklist} />
      </Table.Td>
      <Table.Td>
        <Text size="sm" style={{ whiteSpace: "nowrap" }}>
          {release.size != null ? formatFreeSpace(release.size) : "—"}
        </Text>
      </Table.Td>
      <Table.Td>
        {peers ? (
          <Badge size="xs" color={peersColor} variant="light" className={classes.peersHot}>
            {peers}
          </Badge>
        ) : (
          "—"
        )}
      </Table.Td>
      <Table.Td>
        <LanguagesCell languages={release.languages} />
      </Table.Td>
      <Table.Td>
        <Text size="sm">{release.qualityName ?? "Unknown"}</Text>
      </Table.Td>
      <Table.Td ta="center">
        <Tooltip
          label={
            release.customFormats.length > 0
              ? release.customFormats.join(", ")
              : "Custom format score"
          }
          withArrow
        >
          <Text size="sm">{formatScore(release.customFormatScore)}</Text>
        </Tooltip>
      </Table.Td>
      <Table.Td ta="center">
        <FlagsPopover flags={release.indexerFlags} />
      </Table.Td>
      <Table.Td ta="center">
        <RejectionPopover rejections={release.rejections} />
      </Table.Td>
      <Table.Td>
        <span className={classes.actions}>
          <Tooltip
            label={
              grabState === "grabbed"
                ? "Added to download queue"
                : grabState === "error"
                  ? (grabError ?? "Grab failed")
                  : "Grab release"
            }
            withArrow
          >
            <ActionIcon
              variant="subtle"
              color={grabState === "grabbed" ? "teal" : grabState === "error" ? "red" : "gray"}
              size="sm"
              loading={grabState === "grabbing"}
              disabled={grabState === "grabbed" || overrideState === "grabbing"}
              aria-label="Grab release"
              onClick={() => grabMutation.mutate(false)}
            >
              <DownloadSimpleIcon size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Override & Grab" withArrow>
            <ActionIcon
              variant="subtle"
              color={
                overrideState === "grabbed" ? "teal" : overrideState === "error" ? "red" : "gray"
              }
              size="sm"
              loading={overrideState === "grabbing"}
              disabled={
                overrideState === "grabbed" ||
                grabState === "grabbing" ||
                !release.quality
              }
              aria-label="Override and grab release"
              onClick={() => grabMutation.mutate(true)}
            >
              <ArrowFatLinesDownIcon size={16} />
            </ActionIcon>
          </Tooltip>
        </span>
      </Table.Td>
    </Table.Tr>
  );
}

export function ShowInteractiveSearchTable({
  instanceId,
  seriesId,
  releases,
  history,
  blocklist,
}: Props) {
  const rows = useMemo(() => releases, [releases]);

  if (rows.length === 0) {
    return (
      <Text c="dimmed" size="sm" ta="center" py="xl">
        No releases match this filter.
      </Text>
    );
  }

  return (
    <div className={classes.tableWrap}>
      <ScrollArea.Autosize mah="65vh" type="auto" offsetScrollbars>
        <Table striped highlightOnHover horizontalSpacing="sm" verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={70}>Source</Table.Th>
              <Table.Th w={90}>Age</Table.Th>
              <Table.Th>Title</Table.Th>
              <Table.Th w={110}>Indexer</Table.Th>
              <Table.Th w={56}>History</Table.Th>
              <Table.Th w={80}>Size</Table.Th>
              <Table.Th w={80}>Peers</Table.Th>
              <Table.Th w={130}>Language</Table.Th>
              <Table.Th w={100}>Quality</Table.Th>
              <Table.Th w={48} ta="center">
                <Tooltip label="Custom format score" withArrow>
                  <Text component="span" c="dimmed" style={{ display: "inline-flex" }}>
                    <TrophyIcon size={14} />
                  </Text>
                </Tooltip>
              </Table.Th>
              <Table.Th w={40} ta="center">
                <Tooltip label="Indexer flags" withArrow>
                  <Text component="span" c="dimmed" style={{ display: "inline-flex" }}>
                    <FlagIcon size={14} />
                  </Text>
                </Tooltip>
              </Table.Th>
              <Table.Th w={40} />
              <Table.Th w={72} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((release) => (
              <ReleaseRow
                key={`${release.indexerId}:${release.guid}`}
                release={release}
                instanceId={instanceId}
                seriesId={seriesId}
                history={history}
                blocklist={blocklist}
              />
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea.Autosize>
    </div>
  );
}
