import { Text, Tooltip } from "@mantine/core";
import { ArrowDownIcon } from "@phosphor-icons/react/dist/csr/ArrowDown";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/csr/ArrowsLeftRight";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { FileArrowDownIcon } from "@phosphor-icons/react/dist/csr/FileArrowDown";
import { ProhibitIcon } from "@phosphor-icons/react/dist/csr/Prohibit";
import { QuestionIcon } from "@phosphor-icons/react/dist/csr/Question";
import { TagIcon } from "@phosphor-icons/react/dist/csr/Tag";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import type { HistoryListItem } from "@umbrellarr/shared";
import type { ReactNode } from "react";
import { historyEventLabel } from "@/lib/historyDisplay";

const eventMeta: Record<
  HistoryListItem["eventType"],
  { icon: ReactNode; color: string }
> = {
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
  unknown: { icon: <QuestionIcon size={16} />, color: "gray" },
};

export function HistoryStatusCell({ item }: { item: HistoryListItem }) {
  const meta = eventMeta[item.eventType] ?? eventMeta.unknown;
  const label = historyEventLabel(item.eventType, item.kind);

  return (
    <Tooltip label={label} withArrow>
      <Text c={meta.color} style={{ display: "inline-flex" }}>
        {meta.icon}
      </Text>
    </Tooltip>
  );
}
