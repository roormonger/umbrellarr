import { Tooltip } from "@mantine/core";
import type { QueueListItem } from "@umbrellarr/shared";
import classes from "./QueueStatusCell.module.css";

function statusKey(item: QueueListItem): string {
  const tracked = (item.trackedDownloadStatus ?? "").toLowerCase();
  if (tracked === "warning" || tracked === "error") return tracked;
  const state = (item.trackedDownloadState ?? "").toLowerCase();
  if (state === "delay" || state === "downloadclientunavailable") return "delay";
  return (item.status ?? "unknown").toLowerCase();
}

function statusLabel(item: QueueListItem): string {
  const key = statusKey(item);
  if (key === "delay") return "Pending";
  if (!key) return "Unknown";
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function tooltipText(item: QueueListItem): string {
  const lines: string[] = [statusLabel(item)];
  for (const message of item.statusMessages) {
    if (message.title) lines.push(message.title);
    lines.push(...message.messages);
  }
  if (item.errorMessage) lines.push(item.errorMessage);
  return lines.filter(Boolean).join("\n");
}

export function QueueStatusCell({ item }: { item: QueueListItem }) {
  const key = statusKey(item);
  return (
    <Tooltip label={tooltipText(item)} multiline maw={280} withArrow>
      <span className={classes.wrap} data-status={key} aria-label={statusLabel(item)}>
        <span className={classes.dot} />
      </span>
    </Tooltip>
  );
}
