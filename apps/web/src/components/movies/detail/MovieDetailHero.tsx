import { Badge, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MoviePageDetail } from "@umbrellarr/shared";
import { useMemo } from "react";
import { getMovieLinks, updateMovie } from "@/api/movies";
import {
  MediaDetailHero,
  MetaRow,
  type MediaDetailRating,
} from "@/components/media/detail/MediaDetailHero";
import mediaClasses from "@/components/media/detail/MediaDetailHero.module.css";
import { formatFreeSpace } from "@/lib/moviePath";

const availabilityLabel: Record<MoviePageDetail["availability"], string> = {
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

export function MovieDetailHero({ movie }: { movie: MoviePageDetail }) {
  const queryClient = useQueryClient();
  const runtime = formatRuntime(movie.runtime);
  const size =
    movie.sizeOnDisk != null && movie.sizeOnDisk > 0
      ? formatFreeSpace(movie.sizeOnDisk)
      : undefined;
  const movieQueryKey = ["movie", movie.instanceId, movie.externalId] as const;

  const linksQuery = useQuery({
    queryKey: ["movie-links", movie.instanceId, movie.externalId],
    queryFn: () => getMovieLinks(movie.instanceId, movie.externalId),
    staleTime: 60_000,
  });

  const monitorMutation = useMutation({
    mutationFn: () =>
      updateMovie(movie.instanceId, movie.externalId, {
        monitored: !movie.monitored,
        minimumAvailability: movie.minimumAvailability,
        qualityProfileId: movie.qualityProfileId,
        path: movie.path,
        tagIds: movie.tagIds,
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: movieQueryKey });
      const previous = queryClient.getQueryData<MoviePageDetail>(movieQueryKey);
      if (previous) {
        queryClient.setQueryData<MoviePageDetail>(movieQueryKey, {
          ...previous,
          monitored: !previous.monitored,
        });
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(movieQueryKey, context.previous);
      }
      const wasMonitored = context?.previous?.monitored ?? movie.monitored;
      notifications.show({
        color: "red",
        title: wasMonitored ? "Could not unmonitor" : "Could not monitor",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: movieQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["movies"] });
    },
  });

  const sublineParts = [
    movie.certification,
    movie.year != null ? String(movie.year) : undefined,
    runtime,
  ].filter((part): part is string => Boolean(part));

  const ratingParts = useMemo((): MediaDetailRating[] => {
    const parts: MediaDetailRating[] = [];
    if (movie.tmdbRating != null) {
      parts.push({ label: "TMDb", value: formatRating(movie.tmdbRating, false) });
    }
    if (movie.imdbRating != null) {
      parts.push({ label: "IMDb", value: formatRating(movie.imdbRating, false) });
    }
    if (movie.tomatoRating != null) {
      parts.push({ label: "RT", value: formatRating(movie.tomatoRating, true) });
    }
    if (movie.traktRating != null) {
      parts.push({ label: "Trakt", value: formatRating(movie.traktRating, true) });
    }
    return parts;
  }, [movie.tmdbRating, movie.imdbRating, movie.tomatoRating, movie.traktRating]);

  const links = useMemo(
    () => (linksQuery.data?.links ?? []).filter((link) => link.id !== "trailer"),
    [linksQuery.data?.links],
  );

  return (
    <MediaDetailHero
      title={movie.title}
      posterUrl={movie.posterUrl}
      overview={movie.overview}
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
      monitored={movie.monitored}
      monitorPending={monitorMutation.isPending}
      onToggleMonitor={() => monitorMutation.mutate()}
      youTubeTrailerId={movie.youTubeTrailerId}
      meta={
        <>
          {movie.path && (
            <MetaRow label="Path" wide>
              <Text size="sm" className={mediaClasses.path}>
                {movie.path}
              </Text>
            </MetaRow>
          )}
          <MetaRow label="Status">{availabilityLabel[movie.availability]}</MetaRow>
          {movie.qualityProfileName && (
            <MetaRow label="Quality">{movie.qualityProfileName}</MetaRow>
          )}
          {size && <MetaRow label="Size">{size}</MetaRow>}
          {movie.collection && <MetaRow label="Collection">{movie.collection}</MetaRow>}
          {movie.originalLanguage && (
            <MetaRow label="Original language">{movie.originalLanguage}</MetaRow>
          )}
          {movie.studio && <MetaRow label="Studio">{movie.studio}</MetaRow>}
          {movie.genres.length > 0 && (
            <MetaRow label="Genres" wide>
              <Group gap={6}>
                {movie.genres.map((genre) => (
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
