import { ActionIcon, Image, Text, Tooltip } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import { LinkIcon } from "@phosphor-icons/react/dist/csr/Link";
import { WrenchIcon } from "@phosphor-icons/react/dist/csr/Wrench";
import type { ArtistListItem } from "@umbrellarr/shared";
import { memo, useState, type ComponentType, type MouseEvent, type ReactNode } from "react";
import TiltImport from "react-parallax-tilt";

/** react-parallax-tilt typings lag React 19. */
const Tilt = TiltImport as unknown as ComponentType<Record<string, unknown>>;
import { refreshArtist } from "@/api/artists";
import { ArtistLinksMenu } from "@/components/artists/ArtistLinksMenu";
import { ARTIST_POSTER_STATUS_LABELS } from "@/lib/posterStatusLabels";
import classes from "@/components/media/PosterCard.module.css";

const availabilityLabel = ARTIST_POSTER_STATUS_LABELS;

function markPosterLoaded(img: HTMLImageElement | null) {
  if (img && img.complete && img.naturalWidth > 0) {
    img.dataset.loaded = "true";
  }
}

function stopCardGesture(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

function PosterAction({
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

export const ArtistPosterCard = memo(function ArtistPosterCard({
  item,
  onEdit,
}: {
  item: ArtistListItem;
  onEdit?: (item: ArtistListItem) => void;
}) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const [linksOpen, setLinksOpen] = useState(false);
  const monitoredLabel = item.monitored ? "Monitored" : "Unmonitored";
  const progress =
    item.trackCount != null && item.trackCount > 0
      ? `${item.trackFileCount ?? 0}/${item.trackCount}`
      : undefined;

  function openDetail() {
    void navigate({
      to: "/music/$instanceId/$artistId",
      params: {
        instanceId: item.instanceId,
        artistId: String(item.externalId),
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
    <div className={`${classes.posterWrap} ${classes.posterWrapSquare}`}>
      <div
        className={classes.posterSurface}
        role="link"
        tabIndex={0}
        aria-label={`Open ${item.title}`}
        onClick={openDetail}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openDetail();
          }
        }}
        style={{ cursor: "pointer" }}
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
          <div
            className={classes.bar}
            data-availability={item.availability}
            aria-label={
              progress
                ? `${availabilityLabel[item.availability]} (${progress})`
                : availabilityLabel[item.availability]
            }
          />
        </div>
      </div>

      <div className={classes.actions} role="toolbar" aria-label={`${item.title} actions`}>
        <PosterAction
          label="Refresh info"
          icon={<ArrowsClockwiseIcon size={15} />}
          loading={refreshMutation.isPending}
          onClick={() => refreshMutation.mutate()}
        />
        <PosterAction
          label="Edit"
          icon={<WrenchIcon size={15} />}
          onClick={() => onEdit?.(item)}
        />
        <ArtistLinksMenu
          opened={linksOpen}
          onChange={setLinksOpen}
          instanceId={item.instanceId}
          artistId={item.externalId}
        >
          <div>
            <PosterAction
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

      <Text className={classes.title} title={item.title}>
        {item.title}
      </Text>
    </div>
  );
});
