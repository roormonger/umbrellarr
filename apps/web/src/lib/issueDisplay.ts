import type { IssueStatus, IssueType } from "@umbrellarr/shared";

export function issueTypeLabel(type: IssueType): string {
  switch (type) {
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    case "subtitles":
      return "Subtitles";
    case "other":
      return "Other";
    default:
      return "Unknown";
  }
}

export function issueStatusLabel(status: IssueStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "resolved":
      return "Resolved";
    default:
      return "Unknown";
  }
}

export function issueStatusColor(status: IssueStatus): string {
  switch (status) {
    case "open":
      return "yellow";
    case "resolved":
      return "teal";
    default:
      return "gray";
  }
}

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function formatAffectedSeason(problemSeason: number): string {
  return problemSeason > 0 ? String(problemSeason) : "All seasons";
}

export function formatAffectedEpisode(problemEpisode: number): string {
  return problemEpisode > 0 ? String(problemEpisode) : "All episodes";
}
