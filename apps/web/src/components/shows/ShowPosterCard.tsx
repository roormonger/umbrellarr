import { Image, Text, Tooltip } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import { LinkIcon } from "@phosphor-icons/react/dist/csr/Link";
import { WrenchIcon } from "@phosphor-icons/react/dist/csr/Wrench";
import type { SeriesListItem } from "@umbrellarr/shared";
import { memo, useState, type ComponentType } from "react";
import TiltImport from "react-parallax-tilt";

/** react-parallax-tilt typings lag React 19. */
const Tilt = TiltImport as unknown as ComponentType<Record<string, unknown>>;
import { refreshSeries } from "@/api/shows";
import {
  PosterCardAction,
  PosterCardInstancePicker,
  PosterCardStackBadge,
  PosterCardStatusBar,
  usePosterMixedStatusHighlight,
} from "@/components/media/PosterCardMultiInstance";
import { ShowLinksMenu } from "@/components/shows/ShowLinksMenu";
import type { LibraryGroup } from "@/lib/libraryDedup";
import { SERIES_POSTER_STATUS_LABELS } from "@/lib/posterStatusLabels";
import classes from "@/components/media/PosterCard.module.css";

const statusLabels = SERIES_POSTER_STATUS_LABELS;

function showProgress(copy: SeriesListItem): string | undefined {
  if (copy.episodeCount != null && copy.episodeCount > 0) {
    return `${copy.episodeFileCount ?? 0}/${copy.episodeCount}`;
  }
  return undefined;
}

function markPosterLoaded(img: HTMLImageElement | null) {
  if (img && img.complete && img.naturalWidth > 0) {
    img.dataset.loaded = "true";
  }
}

export const ShowPosterCard = memo(function ShowPosterCard({
  group,
  instanceNames,
  onEdit,
}: {
  group: LibraryGroup<SeriesListItem>;
  instanceNames: Map<string, string>;
  onEdit?: (item: SeriesListItem) => void;
}) {
  const item = group.primary;
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const [linksOpen, setLinksOpen] = useState(false);
  const label = item.year ? `${item.title} (${item.year})` : item.title;
  const monitoredLabel = item.monitored ? "Monitored" : "Unmonitored";
  const isMulti = group.isMultiInstance;
  const { mixedStatus, highlightedKey, highlight } = usePosterMixedStatusHighlight(group.copies);
  const statusSegments = group.copies.map((copy) => ({
    key: copy.instanceId,
    availability: copy.availability,
    instanceLabel: instanceNames.get(copy.instanceId),
    progress: showProgress(copy),
  }));

  function openDetail(copy: SeriesListItem) {
    void navigate({
      to: "/shows/$instanceId/$seriesId",
      params: {
        instanceId: copy.instanceId,
        seriesId: String(copy.externalId),
      },
    });
  }

  const refreshMutation = useMutation({
    mutationFn: () => refreshSeries(item.instanceId, item.externalId),
    onSuccess: () => {
      notifications.show({
        color: "blue",
        message: `Refreshing “${item.title}” in Sonarr`,
      });
      void queryClient.invalidateQueries({ queryKey: ["shows"] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Refresh failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const poster = (
    <div className={classes.posterWrap} data-mixed-status={mixedStatus || undefined}>
      <div
        className={classes.posterSurface}
        role={isMulti ? "group" : "link"}
        tabIndex={isMulti ? -1 : 0}
        aria-label={isMulti ? `${label} on ${group.copies.length} instances` : `Open ${label}`}
        data-multi-instance={isMulti || undefined}
        onClick={isMulti ? undefined : () => openDetail(item)}
        onKeyDown={
          isMulti
            ? undefined
            : (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openDetail(item);
                }
              }
        }
        style={{ cursor: isMulti ? "default" : "pointer" }}
      >
        <div className={classes.posterHit}>
          <Image
            className={classes.poster}
            src={item.posterUrl}
            alt={item.title}
            loading="lazy"
            decoding="async"
            ref={markPosterLoaded}
            onLoad={(event) => {
              event.currentTarget.dataset.loaded = "true";
            }}
            onError={(event) => {
              event.currentTarget.dataset.loaded = "true";
            }}
            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='100%25' height='100%25' fill='%232C2E33'/%3E%3C/svg%3E"
          />
          <PosterCardStatusBar
            segments={statusSegments}
            statusLabels={statusLabels}
            mixedStatus={mixedStatus}
            highlightedKey={highlightedKey}
          />
        </div>
      </div>

      {isMulti ? (
        <>
          <PosterCardStackBadge count={group.copies.length} />
          <PosterCardInstancePicker
            copies={group.copies}
            instanceNames={instanceNames}
            title={item.title}
            onOpen={openDetail}
            onEdit={onEdit}
            mixedStatus={mixedStatus}
            highlightedKey={highlightedKey}
            onHighlight={highlight}
          />
        </>
      ) : null}

      <div className={classes.actions} role="toolbar" aria-label={`${item.title} actions`}>
        <PosterCardAction
          label="Refresh info"
          icon={<ArrowsClockwiseIcon size={15} />}
          loading={refreshMutation.isPending}
          onClick={() => refreshMutation.mutate()}
        />
        {!isMulti ? (
          <PosterCardAction
            label="Edit"
            icon={<WrenchIcon size={15} />}
            onClick={() => onEdit?.(item)}
          />
        ) : null}
        <ShowLinksMenu
          opened={linksOpen}
          onChange={setLinksOpen}
          instanceId={item.instanceId}
          seriesId={item.externalId}
        >
          <div>
            <PosterCardAction
              label="Links"
              icon={<LinkIcon size={15} />}
              onClick={() => setLinksOpen((open) => !open)}
            />
          </div>
        </ShowLinksMenu>
      </div>

      <Tooltip label={monitoredLabel} withArrow position="right">
        <span
          className={classes.badge}
          data-monitored={item.monitored || undefined}
          aria-label={monitoredLabel}
        >
          <BookmarkSimpleIcon weight="fill" />
        </span>
      </Tooltip>
    </div>
  );

  return (
    <div className={classes.card} data-actions-open={linksOpen || undefined}>
      {reduceMotion ? (
        poster
      ) : (
        <Tilt
          className={classes.tilt}
          tiltMaxAngleX={12}
          tiltMaxAngleY={12}
          perspective={900}
          transitionSpeed={450}
          scale={1.04}
          glareEnable
          glareMaxOpacity={0.22}
          glareColor="#ffffff"
          glarePosition="all"
          glareBorderRadius="var(--poster-radius, 8px)"
        >
          {poster}
        </Tilt>
      )}

      <Text className={classes.title} title={label}>
        {item.title}
        {item.year ? ` (${item.year})` : ""}
      </Text>
    </div>
  );
});
