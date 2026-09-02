import { ActionIcon, Button, Tooltip } from "@mantine/core";
import { StackIcon } from "@phosphor-icons/react/dist/csr/Stack";
import { WrenchIcon } from "@phosphor-icons/react/dist/csr/Wrench";
import type { Availability } from "@umbrellarr/shared";
import type { MouseEvent, ReactNode } from "react";
import { formatPosterStatusLabel } from "@/lib/posterStatusLabels";
import classes from "./PosterCard.module.css";

export type PosterCardStatusSegment = {
  key: string;
  availability: Availability;
  instanceLabel?: string;
  progress?: string;
};

function stopCardGesture(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function PosterCardStatusBar({
  segments,
  statusLabels,
}: {
  segments: PosterCardStatusSegment[];
  statusLabels: Record<Availability, string>;
}) {
  const isMulti = segments.length > 1;
  const ariaLabel = segments
    .map((segment) => {
      const status = formatPosterStatusLabel(
        segment.availability,
        statusLabels,
        segment.progress,
      );
      return isMulti && segment.instanceLabel
        ? `${segment.instanceLabel}: ${status}`
        : status;
    })
    .join("; ");

  return (
    <div className={classes.barTrack} role="img" aria-label={ariaLabel}>
      {segments.map((segment) => (
        <div
          key={segment.key}
          className={classes.barSegment}
          data-availability={segment.availability}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function PosterCardStackBadge({ count }: { count: number }) {
  return (
    <span className={classes.stackBadge} aria-hidden>
      <StackIcon size={14} weight="bold" />
      <span className={classes.stackCount}>{count}</span>
    </span>
  );
}

export function PosterCardInstancePicker<T extends { instanceId: string }>({
  copies,
  instanceNames,
  title,
  onOpen,
  onEdit,
}: {
  copies: T[];
  instanceNames: Map<string, string>;
  title: string;
  onOpen: (copy: T) => void;
  onEdit?: (copy: T) => void;
}) {
  return (
    <div
      className={classes.instancePicker}
      role="group"
      aria-label={`${title} on ${copies.length} instances`}
    >
      {copies.map((copy) => {
        const name = instanceNames.get(copy.instanceId) ?? copy.instanceId;
        return (
          <div key={copy.instanceId} className={classes.instancePickerRow}>
            <Button
              size="compact-xs"
              variant="light"
              color="gray"
              className={classes.instanceButton}
              onClick={(event) => {
                stopCardGesture(event);
                onOpen(copy);
              }}
              onMouseDown={stopCardGesture}
            >
              {name}
            </Button>
            {onEdit ? (
              <Tooltip label={`Edit on ${name}`} withArrow position="top">
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  className={classes.instanceEditButton}
                  aria-label={`Edit on ${name}`}
                  onClick={(event) => {
                    stopCardGesture(event);
                    onEdit(copy);
                  }}
                  onMouseDown={stopCardGesture}
                >
                  <WrenchIcon size={14} />
                </ActionIcon>
              </Tooltip>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function PosterCardAction({
  label,
  icon,
  onClick,
  loading,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <Tooltip label={label} withArrow position="top">
      <ActionIcon
        className={classes.actionButton}
        variant="transparent"
        color="gray"
        size="sm"
        radius="sm"
        aria-label={label}
        loading={loading}
        onClick={(event) => {
          stopCardGesture(event);
          onClick?.();
        }}
        onMouseDown={stopCardGesture}
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  );
}
