import { Text, Tooltip } from "@mantine/core";
import { ArrowDownIcon } from "@phosphor-icons/react/dist/csr/ArrowDown";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/csr/ArrowsLeftRight";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { FileArrowDownIcon } from "@phosphor-icons/react/dist/csr/FileArrowDown";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { ProhibitIcon } from "@phosphor-icons/react/dist/csr/Prohibit";
import { QuestionIcon } from "@phosphor-icons/react/dist/csr/Question";
import { RssSimpleIcon } from "@phosphor-icons/react/dist/csr/RssSimple";
import { TagIcon } from "@phosphor-icons/react/dist/csr/Tag";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import type { HistoryListItem } from "@umbrellarr/shared";
import type { ReactNode } from "react";
import { historyEventLabel } from "@/lib/historyDisplay";

const eventMeta: Record<HistoryListItem["eventType"], { icon: ReactNode; color: string }> = {
  grabbed: { icon: <DownloadSimpleIcon size={16} />, color: "violet" },
  downloadFolderImported: { icon: <FileArrowDownIcon size={16} />, color: "teal" },
  movieFolderImported: { icon: <ArrowDownIcon size={16} />, color: "teal" },
  seriesFolderImported: { icon: <ArrowDownIcon size={16} />, color: "teal" },
  albumFolderImported: { icon: <ArrowDownIcon size={16} />, color: "teal" },
  artistFolderImported: { icon: <ArrowDownIcon size={16} />, color: "teal" },
  trackFileImported: { icon: <FileArrowDownIcon size={16} />, color: "teal" },
  downloadFailed: { icon: <WarningCircleIcon size={16} />, color: "red" },
  movieFileDeleted: { icon: <TrashIcon size={16} />, color: "orange" },
  episodeFileDeleted: { icon: <TrashIcon size={16} />, color: "orange" },
  trackFileDeleted: { icon: <TrashIcon size={16} />, color: "orange" },
  movieFileRenamed: { icon: <ArrowsLeftRightIcon size={16} />, color: "blue" },
  episodeFileRenamed: { icon: <ArrowsLeftRightIcon size={16} />, color: "blue" },
  trackFileRenamed: { icon: <ArrowsLeftRightIcon size={16} />, color: "blue" },
  trackFileRetagged: { icon: <TagIcon size={16} />, color: "blue" },
  downloadIgnored: { icon: <ProhibitIcon size={16} />, color: "gray" },
  indexerQuery: { icon: <MagnifyingGlassIcon size={16} />, color: "teal" },
  indexerRss: { icon: <RssSimpleIcon size={16} />, color: "teal" },
  indexerAuth: { icon: <CheckCircleIcon size={16} />, color: "blue" },
  indexerInfo: { icon: <MagnifyingGlassIcon size={16} />, color: "blue" },
  indexerDownload: { icon: <DownloadSimpleIcon size={16} />, color: "violet" },
  unknown: { icon: <QuestionIcon size={16} />, color: "gray" },
};

export function HistoryStatusCell({ item }: { item: HistoryListItem }) {
  const meta = eventMeta[item.eventType] ?? eventMeta.unknown;
  const failed = item.kind === "prowlarr" && item.successful === false;
  const color = failed ? "red" : meta.color;
  const icon = failed ? <WarningCircleIcon size={16} /> : meta.icon;
  const label = failed
    ? `${historyEventLabel(item.eventType, item.kind)} (failed)`
    : historyEventLabel(item.eventType, item.kind);

  return (
    <Tooltip label={label} withArrow>
      <Text c={color} style={{ display: "inline-flex" }}>
        {icon}
      </Text>
    </Tooltip>
  );
}
