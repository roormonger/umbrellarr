import { Anchor, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import type { ReactNode } from "react";
import classes from "./MediaDetailHero.module.css";

export type MediaDetailLink = {
  id: string;
  label: string;
  url: string;
};

export type MediaDetailRating = {
  label: string;
  value: string;
};

export type MediaDetailHeroProps = {
  title: string;
  posterUrl?: string;
  overview?: string;
  sublineParts: string[];
  ratingParts: MediaDetailRating[];
  links: MediaDetailLink[];
  linksLoading?: boolean;
  linksError?: string;
  monitored?: boolean;
  monitorPending?: boolean;
  onToggleMonitor?: () => void;
  /** Metadata `<dl>` children (MetaRow nodes). */
  meta: ReactNode;
  youTubeTrailerId?: string;
  trailerLoading?: boolean;
  /** Lidarr artist pages have no trailer slot. */
  hideTrailer?: boolean;
  /** Seerr request / Discover pages — no Arr monitor toggle. */
  hideMonitor?: boolean;
  /** Optional badge/chip rendered after the title. */
  titleBadge?: ReactNode;
  linksHeading?: string;
  /** When set, replaces the default external links grid. */
  linksContent?: ReactNode;
  /** When set, replaces the trailer iframe / empty state. */
  trailerContent?: ReactNode;
};

export function MetaRow({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? classes.metaRowWide : classes.metaRow}>
      <dt className={classes.metaLabel}>{label}</dt>
      <dd className={classes.metaValue}>{children}</dd>
    </div>
  );
}

export function MediaDetailHero({
  title,
  posterUrl,
  overview,
  sublineParts,
  ratingParts,
  links,
  linksLoading,
  linksError,
  monitored = false,
  monitorPending,
  onToggleMonitor,
  meta,
  youTubeTrailerId,
  trailerLoading,
  hideTrailer,
  hideMonitor,
  titleBadge,
  linksHeading = "Links",
  linksContent,
  trailerContent,
}: MediaDetailHeroProps) {
  const hasTrailer = Boolean(youTubeTrailerId);
  const hasTrailerSlot = !hideTrailer;
  const monitoredLabel = monitored ? "Monitored" : "Unmonitored";

  return (
    <section className={classes.hero}>
      <div className={hideTrailer ? classes.topNoTrailer : classes.top}>
        <div className={classes.posterWrap}>
          <div className={classes.poster}>
            {posterUrl ? <img src={posterUrl} alt="" /> : <div className={classes.posterFallback} />}
          </div>
        </div>

        <div className={`${classes.panel} ${classes.synopsisPanel}`}>
          <div className={classes.titleRow}>
            {!hideMonitor && onToggleMonitor ? (
              <Tooltip label={`${monitoredLabel} — click to toggle`} withArrow position="top">
                <UnstyledButton
                  className={classes.monitorToggle}
                  data-monitored={monitored || undefined}
                  data-pending={monitorPending || undefined}
                  aria-label={`${monitoredLabel}. Click to ${monitored ? "unmonitor" : "monitor"}`}
                  aria-pressed={monitored}
                  disabled={monitorPending}
                  onClick={onToggleMonitor}
                >
                  <BookmarkSimpleIcon weight={monitored ? "fill" : "regular"} size="1em" />
                </UnstyledButton>
              </Tooltip>
            ) : null}
            <h1 className={classes.title}>{title}</h1>
            {titleBadge ? <div className={classes.titleBadge}>{titleBadge}</div> : null}
          </div>

          {(sublineParts.length > 0 || ratingParts.length > 0) && (
            <div className={classes.subline}>
              {sublineParts.map((part, index) => (
                <Text span key={`meta-${index}`} className={classes.sublineMeta}>
                  {part}
                </Text>
              ))}
              {ratingParts.map((part) => (
                <Text span key={part.label} className={classes.sublineRating}>
                  <span className={classes.ratingLabel}>{part.label}</span>{" "}
                  <span className={classes.ratingValue}>{part.value}</span>
                </Text>
              ))}
            </div>
          )}

          {overview ? (
            <p className={classes.overview}>{overview}</p>
          ) : (
            <Text c="dimmed" size="sm" className={classes.overview}>
              No synopsis available.
            </Text>
          )}
        </div>

        <div className={`${classes.panel} ${classes.linksPanel}`}>
          {linksHeading ? <Text className={classes.sideHeading}>{linksHeading}</Text> : null}
          {linksContent ? (
            <div className={classes.linksCustom}>{linksContent}</div>
          ) : (
            <>
              {linksLoading && (
                <Text size="sm" c="dimmed">
                  Loading…
                </Text>
              )}
              {linksError && (
                <Text size="sm" c="red">
                  {linksError}
                </Text>
              )}
              {links.length > 0 && (
                <div className={classes.linksList}>
                  {links.map((link) => (
                    <Anchor
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className={classes.linkCell}
                      title={link.url}
                    >
                      {link.label}
                    </Anchor>
                  ))}
                  {links.length % 2 === 1 && (
                    <div className={classes.linkCellFiller} aria-hidden />
                  )}
                </div>
              )}
              {!linksLoading && !linksError && links.length === 0 && (
                <Text size="sm" c="dimmed">
                  —
                </Text>
              )}
            </>
          )}
        </div>

        <dl className={`${classes.panel} ${classes.metaPanel}`}>{meta}</dl>

        {hasTrailerSlot && (
          <div className={`${classes.panel} ${classes.trailerPanel}`}>
            {trailerContent ?? (
              hasTrailer && youTubeTrailerId ? (
                <div className={classes.trailer}>
                  <iframe
                    title={`${title} trailer`}
                    src={`https://www.youtube-nocookie.com/embed/${youTubeTrailerId}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : (
                <div className={classes.trailerEmpty}>
                  <Text size="sm" c="dimmed">
                    {trailerLoading ? "Looking for trailer…" : "No trailer available"}
                  </Text>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
