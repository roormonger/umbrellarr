import { Badge, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SeriesPageDetail } from "@umbrellarr/shared";
import { useMemo } from "react";
import { getSeriesLinks, getSeriesTrailer, updateSeries } from "@/api/shows";
import {
  MediaDetailHero,
  MetaRow,
  type MediaDetailRating,
} from "@/components/media/detail/MediaDetailHero";
import mediaClasses from "@/components/media/detail/MediaDetailHero.module.css";
import { formatFreeSpace } from "@/lib/moviePath";

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

  const trailerQuery = useQuery({
    queryKey: ["series-trailer", series.instanceId, series.externalId],
    queryFn: () => getSeriesTrailer(series.instanceId, series.externalId),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const trailerId = series.youTubeTrailerId ?? trailerQuery.data?.youTubeTrailerId;

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

  const seasonsPart =
    series.seasonCount != null
      ? `${series.seasonCount} ${series.seasonCount === 1 ? "season" : "seasons"}`
      : undefined;
  const episodesPart = episodeProgress ? `${episodeProgress} episodes` : undefined;

  const sublineParts = [
    series.certification,
    series.year != null ? String(series.year) : undefined,
    runtime,
    seasonsPart,
    episodesPart,
  ].filter((part): part is string => Boolean(part));

  const ratingParts = useMemo((): MediaDetailRating[] => {
    const parts: MediaDetailRating[] = [];
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

  return (
    <MediaDetailHero
      title={series.title}
      posterUrl={series.posterUrl}
      overview={series.overview}
      sublineParts={sublineParts}
      ratingParts={ratingParts}
      links={links}
      linksLoading={linksQuery.isLoading}
      linksError={
        linksQuery.error
          ? linksQuery.error instanceof Error
            ? linksQuery.error.message
            : "Failed to load links"
          : undefined
      }
      monitored={series.monitored}
      monitorPending={monitorMutation.isPending}
      onToggleMonitor={() => monitorMutation.mutate()}
      youTubeTrailerId={trailerId}
      trailerLoading={trailerQuery.isFetching && !trailerId}
      meta={
        <>
          {series.path && (
            <MetaRow label="Path" wide>
              <Text size="sm" className={mediaClasses.path}>
                {series.path}
              </Text>
            </MetaRow>
          )}
          <MetaRow label="Status">{availabilityLabel[series.availability]}</MetaRow>
          {series.qualityProfileName && (
            <MetaRow label="Quality">{series.qualityProfileName}</MetaRow>
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
        </>
      }
    />
  );
}
