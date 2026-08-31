import { Badge, Button, Group, Text } from "@mantine/core";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import type { MediaRequestItem, RequestStatus } from "@umbrellarr/shared";
import classes from "./RequestListRow.module.css";

function statusColor(status: RequestStatus): string {
  switch (status) {
    case "pending":
      return "yellow";
    case "approved":
    case "completed":
      return "teal";
    case "declined":
    case "failed":
      return "red";
    default:
      return "gray";
  }
}

function formatRequestedAt(value: string): string {
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

type Props = {
  request: MediaRequestItem;
  approving?: boolean;
  declining?: boolean;
  onApprove: () => void;
  onDecline: () => void;
  onEdit: () => void;
};

export function RequestListRow({
  request,
  approving,
  declining,
  onApprove,
  onDecline,
  onEdit,
}: Props) {
  const pending = request.status === "pending";
  const seasonLabel =
    request.mediaType === "tv" && request.seasons.length === 1
      ? "Season"
      : "Seasons";

  return (
    <div className={classes.row}>
      {request.backdropUrl ? (
        <div
          className={classes.backdrop}
          style={{ backgroundImage: `url(${request.backdropUrl})` }}
          aria-hidden
        />
      ) : (
        <div className={classes.backdrop} aria-hidden />
      )}

      <div className={classes.body}>
        {request.posterUrl ? (
          <img className={classes.poster} src={request.posterUrl} alt="" loading="lazy" />
        ) : (
          <div className={classes.poster} aria-hidden />
        )}
        <div className={classes.meta}>
          <div className={classes.titleRow}>
            {request.year ? <span className={classes.year}>{request.year}</span> : null}
            <Text fw={700} size="md" lineClamp={2}>
              {request.title}
            </Text>
          </div>
          {request.mediaType === "tv" && request.seasons.length > 0 ? (
            <div className={classes.seasons}>
              <Text size="xs" c="dimmed">
                {seasonLabel}
              </Text>
              {request.seasons.map((season) => (
                <span key={season.seasonNumber} className={classes.seasonChip}>
                  {season.seasonNumber}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className={classes.statusBlock}>
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            Status
          </Text>
          <Badge size="sm" color={statusColor(request.status)} variant="light">
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Badge>
        </Group>
        {request.requestedBy ? (
          <Text size="xs" c="dimmed">
            Requested {formatRequestedAt(request.createdAt)} by {request.requestedBy.displayName}
          </Text>
        ) : (
          <Text size="xs" c="dimmed">
            Requested {formatRequestedAt(request.createdAt)}
          </Text>
        )}
        <div className={classes.actions}>
          {pending ? (
            <>
              <Button
                size="xs"
                color="teal"
                leftSection={<CheckIcon size={14} />}
                loading={approving}
                onClick={onApprove}
              >
                Approve
              </Button>
              <Button
                size="xs"
                color="red"
                leftSection={<XIcon size={14} />}
                loading={declining}
                onClick={onDecline}
              >
                Decline
              </Button>
              <Button
                size="xs"
                color="violet"
                leftSection={<PencilSimpleIcon size={14} />}
                onClick={onEdit}
              >
                Edit Request
              </Button>
            </>
          ) : (
            <Badge size="sm" variant="outline" color="gray">
              {request.mediaType === "tv" ? "Series" : "Movie"}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
