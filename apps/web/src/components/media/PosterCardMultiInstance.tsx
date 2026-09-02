import { ActionIcon, Button, Tooltip } from "@mantine/core";
import { StackIcon } from "@phosphor-icons/react/dist/csr/Stack";
import { WrenchIcon } from "@phosphor-icons/react/dist/csr/Wrench";
import type { Availability } from "@umbrellarr/shared";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { formatPosterStatusLabel } from "@/lib/posterStatusLabels";
import { hasMixedAvailability, POSTER_STATUS_COLORS } from "@/lib/posterStatusColors";
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

export function usePosterMixedStatusHighlight<
  T extends { instanceId: string; availability: Availability },
>(copies: T[]) {
  const mixedStatus = useMemo(() => hasMixedAvailability(copies), [copies]);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  function highlight(instanceId: string | null) {
    if (mixedStatus) setHighlightedKey(instanceId);
  }

  return { mixedStatus, highlightedKey, highlight };
}

export function PosterCardStatusBar({
  segments,
  statusLabels,
  highlightedKey,
  mixedStatus = false,
}: {
  segments: PosterCardStatusSegment[];
  statusLabels: Record<Availability, string>;
  highlightedKey?: string | null;
  mixedStatus?: boolean;
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
          data-highlighted={
            mixedStatus && highlightedKey === segment.key ? true : undefined
          }
          style={
            {
              "--status-color": POSTER_STATUS_COLORS[segment.availability],
            } as CSSProperties
          }
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

export function PosterCardInstancePicker<
  T extends { instanceId: string; availability: Availability },
>({
  copies,
  instanceNames,
  title,
  onOpen,
  onEdit,
  mixedStatus = false,
  highlightedKey,
  onHighlight,
}: {
  copies: T[];
  instanceNames: Map<string, string>;
  title: string;
  onOpen: (copy: T) => void;
  onEdit?: (copy: T) => void;
  mixedStatus?: boolean;
  highlightedKey?: string | null;
  onHighlight?: (instanceId: string | null) => void;
}) {
  return (
    <div
      className={classes.instancePicker}
      role="group"
      aria-label={`${title} on ${copies.length} instances`}
    >
      {copies.map((copy) => {
        const name = instanceNames.get(copy.instanceId) ?? copy.instanceId;
        const statusColor = POSTER_STATUS_COLORS[copy.availability];
        const rowHighlighted = mixedStatus && highlightedKey === copy.instanceId;
        return (
          <div
            key={copy.instanceId}
            className={classes.instancePickerRow}
            data-availability={copy.availability}
            data-highlighted={rowHighlighted || undefined}
            style={{ "--status-color": statusColor } as CSSProperties}
            onMouseEnter={mixedStatus ? () => onHighlight?.(copy.instanceId) : undefined}
            onMouseLeave={mixedStatus ? () => onHighlight?.(null) : undefined}
            onFocusCapture={mixedStatus ? () => onHighlight?.(copy.instanceId) : undefined}
            onBlurCapture={
              mixedStatus
                ? (event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      onHighlight?.(null);
                    }
                  }
                : undefined
            }
          >
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
