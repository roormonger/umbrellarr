import { Badge, Button, Group, Text, Tooltip } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import type { IssueListItem, IssueStatus, IssueType } from "@umbrellarr/shared";
import classes from "./IssueListRow.module.css";

function statusColor(status: IssueStatus): string {
  switch (status) {
    case "open":
      return "yellow";
    case "resolved":
      return "teal";
    default:
      return "gray";
  }
}

function issueTypeLabel(type: IssueType): string {
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

function formatOpenedAt(value: string): string {
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

const MAX_MESSAGE_LENGTH = 120;

type Props = {
  instanceId: string;
  issue: IssueListItem;
  showInstanceLabel?: boolean;
};

export function IssueListRow({ instanceId, issue, showInstanceLabel }: Props) {
  const navigate = useNavigate();
  const message = issue.message ?? "";
  const shouldTruncate = message.length > MAX_MESSAGE_LENGTH;
  const truncatedMessage = shouldTruncate
    ? `${message.slice(0, MAX_MESSAGE_LENGTH)}…`
    : message;

  function openDetail() {
    void navigate({
      to: "/issues/$instanceId/$issueId",
      params: { instanceId, issueId: String(issue.id) },
    });
  }

  return (
    <div className={classes.row} data-issue-row>
      {issue.backdropUrl ? (
        <div
          className={classes.backdrop}
          style={{ backgroundImage: `url(${issue.backdropUrl})` }}
          aria-hidden
        />
      ) : (
        <div className={classes.backdrop} aria-hidden />
      )}

      <div className={classes.body}>
        {issue.posterUrl ? (
          <img className={classes.poster} src={issue.posterUrl} alt="" loading="lazy" />
        ) : (
          <div className={classes.poster} aria-hidden />
        )}
        <div className={classes.meta}>
          <div className={classes.titleRow}>
            {issue.year ? <span className={classes.year}>{issue.year}</span> : null}
            <Text fw={700} size="md" lineClamp={2}>
              {issue.title}
            </Text>
          </div>
          {showInstanceLabel && issue.instanceName ? (
            <Text size="xs" c="dimmed">
              {issue.instanceName}
            </Text>
          ) : null}
          {message ? (
            shouldTruncate ? (
              <Tooltip label={message} multiline maw={320} withArrow position="top">
                <Text size="sm" c="dimmed" className={classes.message} lineClamp={2}>
                  {truncatedMessage}
                </Text>
              </Tooltip>
            ) : (
              <Text size="sm" c="dimmed" className={classes.message} lineClamp={2}>
                {message}
              </Text>
            )
          ) : null}
          {issue.mediaType === "tv" ? (
            <div className={classes.scope}>
              <Text size="xs" c="dimmed">
                Season
              </Text>
              <span className={classes.scopeChip}>
                {issue.problemSeason > 0 ? issue.problemSeason : "All"}
              </span>
              {issue.problemSeason > 0 ? (
                <>
                  <Text size="xs" c="dimmed">
                    Episode
                  </Text>
                  <span className={classes.scopeChip}>
                    {issue.problemEpisode > 0 ? issue.problemEpisode : "All"}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className={classes.statusBlock}>
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            Status
          </Text>
          <Badge size="sm" color={statusColor(issue.status)} variant="light">
            {issue.status === "open"
              ? "Open"
              : issue.status === "resolved"
                ? "Resolved"
                : "Unknown"}
          </Badge>
        </Group>
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            Type
          </Text>
          <Text size="xs">{issueTypeLabel(issue.issueType)}</Text>
        </Group>
        {issue.createdBy ? (
          <Text size="xs" c="dimmed">
            Opened {formatOpenedAt(issue.createdAt)} by {issue.createdBy.displayName}
          </Text>
        ) : (
          <Text size="xs" c="dimmed">
            Opened {formatOpenedAt(issue.createdAt)}
          </Text>
        )}
        <div className={classes.actions}>
          <Button size="xs" color="violet" onClick={openDetail}>
            View Issue
          </Button>
        </div>
      </div>
    </div>
  );
}
