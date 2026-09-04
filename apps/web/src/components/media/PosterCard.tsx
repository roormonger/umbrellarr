import { Image, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import { LinkIcon } from "@phosphor-icons/react/dist/csr/Link";
import { WrenchIcon } from "@phosphor-icons/react/dist/csr/Wrench";
import type { MovieListItem } from "@umbrellarr/shared";
import { memo, useState } from "react";
import { refreshMovie } from "@/api/movies";
import { MovieLinksMenu } from "@/components/movies/MovieLinksMenu";
import {
  PosterCardAction,
  PosterCardInstancePicker,
  PosterCardStackBadge,
  PosterCardStatusBar,
  usePosterMixedStatusHighlight,
} from "@/components/media/PosterCardMultiInstance";
import type { LibraryGroup } from "@/lib/libraryDedup";
import { MOVIE_POSTER_STATUS_LABELS } from "@/lib/posterStatusLabels";
import classes from "./PosterCard.module.css";

const statusLabels = MOVIE_POSTER_STATUS_LABELS;

function markPosterLoaded(img: HTMLImageElement | null) {
  if (img && img.complete && img.naturalWidth > 0) {
    img.dataset.loaded = "true";
  }
}

export const PosterCard = memo(function PosterCard({
  group,
  instanceNames,
  onEdit,
}: {
  group: LibraryGroup<MovieListItem>;
  instanceNames: Map<string, string>;
  onEdit?: (item: MovieListItem) => void;
}) {
  const item = group.primary;
  const navigate = useNavigate();
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
  }));

  function openDetail(copy: MovieListItem) {
    void navigate({
      to: "/movies/$instanceId/$movieId",
      params: {
        instanceId: copy.instanceId,
        movieId: String(copy.externalId),
      },
    });
  }

  const refreshMutation = useMutation({
    mutationFn: () => refreshMovie(item.instanceId, item.externalId),
    onSuccess: () => {
      notifications.show({
        color: "blue",
        message: `Refreshing “${item.title}” in Radarr`,
      });
      void queryClient.invalidateQueries({ queryKey: ["movies"] });
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
        <MovieLinksMenu
          opened={linksOpen}
          onChange={setLinksOpen}
          instanceId={item.instanceId}
          movieId={item.externalId}
        >
          <div>
            <PosterCardAction
              label="Links"
              icon={<LinkIcon size={15} />}
              onClick={() => setLinksOpen((open) => !open)}
            />
          </div>
        </MovieLinksMenu>
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
      {poster}

      <Text className={classes.title} title={label}>
        {item.title}
        {item.year ? ` (${item.year})` : ""}
      </Text>
    </div>
  );
});
