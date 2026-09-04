import { Image, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import { LinkIcon } from "@phosphor-icons/react/dist/csr/Link";
import { WrenchIcon } from "@phosphor-icons/react/dist/csr/Wrench";
import type { ArtistListItem } from "@umbrellarr/shared";
import { memo, useState } from "react";
import { refreshArtist } from "@/api/artists";
import { ArtistLinksMenu } from "@/components/artists/ArtistLinksMenu";
import {
  PosterCardAction,
  PosterCardInstancePicker,
  PosterCardStackBadge,
  PosterCardStatusBar,
  usePosterMixedStatusHighlight,
} from "@/components/media/PosterCardMultiInstance";
import type { LibraryGroup } from "@/lib/libraryDedup";
import { ARTIST_POSTER_STATUS_LABELS } from "@/lib/posterStatusLabels";
import classes from "@/components/media/PosterCard.module.css";

const statusLabels = ARTIST_POSTER_STATUS_LABELS;

function artistProgress(copy: ArtistListItem): string | undefined {
  if (copy.trackCount != null && copy.trackCount > 0) {
    return `${copy.trackFileCount ?? 0}/${copy.trackCount}`;
  }
  return undefined;
}

function markPosterLoaded(img: HTMLImageElement | null) {
  if (img && img.complete && img.naturalWidth > 0) {
    img.dataset.loaded = "true";
  }
}

export const ArtistPosterCard = memo(function ArtistPosterCard({
  group,
  instanceNames,
  onEdit,
}: {
  group: LibraryGroup<ArtistListItem>;
  instanceNames: Map<string, string>;
  onEdit?: (item: ArtistListItem) => void;
}) {
  const item = group.primary;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [linksOpen, setLinksOpen] = useState(false);
  const monitoredLabel = item.monitored ? "Monitored" : "Unmonitored";
  const isMulti = group.isMultiInstance;
  const { mixedStatus, highlightedKey, highlight } = usePosterMixedStatusHighlight(group.copies);
  const statusSegments = group.copies.map((copy) => ({
    key: copy.instanceId,
    availability: copy.availability,
    instanceLabel: instanceNames.get(copy.instanceId),
    progress: artistProgress(copy),
  }));

  function openDetail(copy: ArtistListItem) {
    void navigate({
      to: "/music/$instanceId/$artistId",
      params: {
        instanceId: copy.instanceId,
        artistId: String(copy.externalId),
      },
    });
  }

  const refreshMutation = useMutation({
    mutationFn: () => refreshArtist(item.instanceId, item.externalId),
    onSuccess: () => {
      notifications.show({
        color: "blue",
        message: `Refreshing “${item.title}” in Lidarr`,
      });
      void queryClient.invalidateQueries({ queryKey: ["artists"] });
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
    <div
      className={`${classes.posterWrap} ${classes.posterWrapSquare}`}
      data-mixed-status={mixedStatus || undefined}
    >
      <div
        className={classes.posterSurface}
        role={isMulti ? "group" : "link"}
        tabIndex={isMulti ? -1 : 0}
        aria-label={
          isMulti ? `${item.title} on ${group.copies.length} instances` : `Open ${item.title}`
        }
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
            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='100%25' height='100%25' fill='%232C2E33'/%3E%3C/svg%3E"
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
        <ArtistLinksMenu
          opened={linksOpen}
          onChange={setLinksOpen}
          instanceId={item.instanceId}
          artistId={item.externalId}
        >
          <div>
            <PosterCardAction
              label="Links"
              icon={<LinkIcon size={15} />}
              onClick={() => setLinksOpen((open) => !open)}
            />
          </div>
        </ArtistLinksMenu>
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

      <Text className={classes.title} title={item.title}>
        {item.title}
      </Text>
    </div>
  );
});
