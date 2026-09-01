import type { Availability } from "@umbrellarr/shared";

/** Arr calendar legend labels (subset used on the unified calendar). */
export const CALENDAR_STATUS_LEGEND: Array<{ status: Availability; label: string }> = [
  { status: "downloaded", label: "Downloaded (Monitored)" },
  { status: "downloadedUnmonitored", label: "Downloaded (Unmonitored)" },
  { status: "missingMonitored", label: "Missing (Monitored)" },
  { status: "missingUnmonitored", label: "Missing (Unmonitored)" },
  { status: "queued", label: "Queued" },
  { status: "unreleased", label: "Unreleased" },
];

export function calendarStatusColor(status: Availability): string {
  switch (status) {
    case "downloaded":
    case "ended":
      return "#00853d";
    case "downloadedUnmonitored":
      return "#888888";
    case "missingMonitored":
      return "#f05050";
    case "missingUnmonitored":
      return "#ffa500";
    case "queued":
    case "downloading":
      return "#7a43b6";
    case "unreleased":
    case "continuing":
    default:
      return "#5d9cec";
  }
}
