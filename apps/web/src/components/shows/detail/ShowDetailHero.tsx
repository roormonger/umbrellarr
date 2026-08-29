import { Anchor, Badge, Group, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SeriesPageDetail } from "@umbrellarr/shared";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { getSeriesLinks, getSeriesTrailer, updateSeries } from "@/api/shows";
import { formatFreeSpace } from "@/lib/moviePath";
import classes from "./ShowDetailHero.module.css";

const availabilityLabel: Record<SeriesPageDetail["availability"], string> = {
  downloaded: "Downloaded",
  missing: "Missing",
  unavailable: "Unavailable",
  unmonitored: "Unmonitored",
};

function formatRuntime(minutes?: number): string | undefined {
  if (minutes == null || minutes <= 0) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatRating(value: number, percent: boolean): string {
  if (percent) return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}%`;
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function MetaRow({
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

export function ShowDetailHero({ series }: { series: SeriesPageDetail }) {
  const queryClient = useQueryClient();
  const runtime = formatRuntime(series.runtime);
  const size =
    series.sizeOnDisk != null && series.sizeOnDisk > 0
      ? formatFreeSpace(series.sizeOnDisk)
      : undefined;
  const seriesQueryKey = ["series", series.instanceId, series.externalId] as const;
  const episodeProgress =
    series.episodeCount != null && series.episodeCount > 0
      ? `${series.episodeFileCount ?? 0} / ${series.episodeCount}`
      : undefined;

  const linksQuery = useQuery({
    queryKey: ["series-links", series.instanceId, series.externalId],
    queryFn: () => getSeriesLinks(series.instanceId, series.externalId),
    staleTime: 60_000,
  });

  // Sonarr rarely stores trailers; resolve from linked TMDb/IMDb/TV Maze pages.
  const trailerQuery = useQuery({
    queryKey: ["series-trailer", series.instanceId, series.externalId],
    queryFn: () => getSeriesTrailer(series.instanceId, series.externalId),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const trailerId = series.youTubeTrailerId ?? trailerQuery.data?.youTubeTrailerId;
  const hasTrailer = Boolean(trailerId);

  const monitorMutation = useMutation({
    mutationFn: () =>
      updateSeries(series.instanceId, series.externalId, {
        monitored: !series.monitored,
        monitorNewItems: series.monitorNewItems,
        seriesType: series.seriesType,
        seasonFolder: series.seasonFolder,
        qualityProfileId: series.qualityProfileId,
        path: series.path,
        tagIds: series.tagIds,
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: seriesQueryKey });
      const previous = queryClient.getQueryData<SeriesPageDetail>(seriesQueryKey);
      if (previous) {
        queryClient.setQueryData<SeriesPageDetail>(seriesQueryKey, {
          ...previous,
          monitored: !previous.monitored,
        });
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(seriesQueryKey, context.previous);
      }
      const wasMonitored = context?.previous?.monitored ?? series.monitored;
      notifications.show({
        color: "red",
        title: wasMonitored ? "Could not unmonitor" : "Could not monitor",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: seriesQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["shows"] });
    },
  });

  const sublineParts = [
    series.certification,
    series.year != null ? String(series.year) : undefined,
    runtime,
  ].filter(Boolean);

  const ratingParts = useMemo(() => {
    const parts: Array<{ label: string; value: string }> = [];
    if (series.tmdbRating != null) {
      parts.push({ label: "TMDb", value: formatRating(series.tmdbRating, false) });
    }
    if (series.imdbRating != null) {
      parts.push({ label: "IMDb", value: formatRating(series.imdbRating, false) });
    }
    if (series.traktRating != null) {
      parts.push({ label: "Trakt", value: formatRating(series.traktRating, true) });
    }
    return parts;
  }, [series.tmdbRating, series.imdbRating, series.traktRating]);

  const links = useMemo(
    () => (linksQuery.data?.links ?? []).filter((link) => link.id !== "trailer"),
    [linksQuery.data?.links],
  );

  const monitoredLabel = series.monitored ? "Monitored" : "Unmonitored";

  return (
    <section className={classes.hero}>
      <div className={classes.top}>
        <div className={classes.posterWrap}>
          <div className={classes.poster}>
            {series.posterUrl ? (
              <img src={series.posterUrl} alt="" />
            ) : (
              <div className={classes.posterFallback} />
            )}
          </div>
        </div>

        <div className={`${classes.panel} ${classes.synopsisPanel}`}>
          <div className={classes.titleRow}>
            <Tooltip label={`${monitoredLabel} — click to toggle`} withArrow position="top">
              <UnstyledButton
                className={classes.monitorToggle}
                data-monitored={series.monitored || undefined}
                data-pending={monitorMutation.isPending || undefined}
                aria-label={`${monitoredLabel}. Click to ${series.monitored ? "unmonitor" : "monitor"}`}
                aria-pressed={series.monitored}
                disabled={monitorMutation.isPending}
                onClick={() => monitorMutation.mutate()}
              >
                <BookmarkSimpleIcon
                  weight={series.monitored ? "fill" : "regular"}
                  size="1em"
                />
              </UnstyledButton>
            </Tooltip>
            <h1 className={classes.title}>{series.title}</h1>
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

          {series.overview ? (
            <p className={classes.overview}>{series.overview}</p>
          ) : (
            <Text c="dimmed" size="sm" className={classes.overview}>
              No synopsis available.
            </Text>
          )}
        </div>

        <div className={`${classes.panel} ${classes.linksPanel}`}>
          <Text className={classes.sideHeading}>Links</Text>
          {linksQuery.isLoading && (
            <Text size="sm" c="dimmed">
              Loading…
            </Text>
          )}
          {linksQuery.error && (
            <Text size="sm" c="red">
              {linksQuery.error instanceof Error
                ? linksQuery.error.message
                : "Failed to load links"}
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
                  <span className={classes.linkLabel}>{link.label}</span>
                  <span className={classes.linkSep}> - </span>
                  <span className={classes.linkAction}>(link)</span>
                </Anchor>
              ))}
            </div>
          )}
          {!linksQuery.isLoading && !linksQuery.error && links.length === 0 && (
            <Text size="sm" c="dimmed">
              —
            </Text>
          )}
        </div>

        <dl className={`${classes.panel} ${classes.metaPanel}`}>
          {series.path && (
            <MetaRow label="Path" wide>
              <Text size="sm" className={classes.path}>
                {series.path}
              </Text>
            </MetaRow>
          )}
          <MetaRow label="Status">{availabilityLabel[series.availability]}</MetaRow>
          {series.qualityProfileName && (
            <MetaRow label="Quality">{series.qualityProfileName}</MetaRow>
          )}
          {episodeProgress && <MetaRow label="Episodes">{episodeProgress}</MetaRow>}
          {series.seasonCount != null && (
            <MetaRow label="Seasons">{String(series.seasonCount)}</MetaRow>
          )}
          {size && <MetaRow label="Size">{size}</MetaRow>}
          {series.network && <MetaRow label="Network">{series.network}</MetaRow>}
          {series.originalLanguage && (
            <MetaRow label="Original language">{series.originalLanguage}</MetaRow>
          )}
          {series.status && (
            <MetaRow label="Series status">
              <Text size="sm" tt="capitalize">
                {series.status}
              </Text>
            </MetaRow>
          )}
          {series.genres.length > 0 && (
            <MetaRow label="Genres" wide>
              <Group gap={6}>
                {series.genres.map((genre) => (
                  <Badge key={genre} size="sm" variant="light" color="gray">
                    {genre}
                  </Badge>
                ))}
              </Group>
            </MetaRow>
          )}
        </dl>

        <div className={`${classes.panel} ${classes.trailerPanel}`}>
          {hasTrailer && trailerId ? (
            <div className={classes.trailer}>
              <iframe
                title={`${series.title} trailer`}
                src={`https://www.youtube-nocookie.com/embed/${trailerId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <div className={classes.trailerEmpty}>
              <Text size="sm" c="dimmed">
                {trailerQuery.isFetching ? "Looking for trailer…" : "No trailer available"}
              </Text>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
