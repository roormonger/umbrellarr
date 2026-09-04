import { Group, Loader, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { MovieCredit } from "@umbrellarr/shared";
import { getDiscoverTitle } from "@/api/discover";
import { APP_LOADER_SIZE } from "@/components/QuantumLoader";
import { DiscoverAddProvider, useDiscoverAdd } from "@/components/discover/DiscoverAddContext";
import { DiscoverAddSplitButton } from "@/components/discover/DiscoverAddSplitButton";
import { MovieDetailCredits } from "@/components/movies/detail/MovieDetailCredits";
import {
  MediaDetailHero,
  MetaRow,
  type MediaDetailRating,
} from "@/components/media/detail/MediaDetailHero";
import { usePageHeader } from "@/layout/pageHeader";
import { ACTIVITY_LIST_STALE_MS, focusAwareRefetchInterval, SEERR_LIST_POLL_MS } from "@/lib/queryFocus";
import classes from "./MovieDetailPage.module.css";

function formatRuntime(minutes?: number): string | undefined {
  if (minutes == null || minutes <= 0) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatVote(value?: number): string | undefined {
  if (value == null || value <= 0) return undefined;
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function DiscoverTitleContent() {
  const { instanceId, mediaType: mediaTypeParam, tmdbId: tmdbIdParam } = useParams({
    from: "/app/discover/$instanceId/$mediaType/$tmdbId",
  });
  const mediaType = mediaTypeParam === "tv" ? "tv" : "movie";
  const tmdbId = Number(tmdbIdParam);
  const { openAdd } = useDiscoverAdd();

  const pageQuery = useQuery({
    queryKey: ["discover", "title", instanceId, mediaType, tmdbId],
    queryFn: () => getDiscoverTitle(instanceId, mediaType, tmdbId),
    enabled: Number.isFinite(tmdbId) && tmdbId > 0,
    staleTime: ACTIVITY_LIST_STALE_MS,
    refetchInterval: focusAwareRefetchInterval(SEERR_LIST_POLL_MS),
  });

  const media = pageQuery.data?.media;
  const title = media
    ? media.year
      ? `${media.title} (${media.year})`
      : media.title
    : "Title";
  usePageHeader(title, null, "/discover");

  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return <Text className={classes.error}>Invalid title id</Text>;
  }

  if (pageQuery.isLoading) {
    return (
      <Group justify="center" py="xl">
        <Loader size={APP_LOADER_SIZE} />
      </Group>
    );
  }

  if (pageQuery.error || !media) {
    return (
      <Text className={classes.error}>
        {pageQuery.error instanceof Error ? pageQuery.error.message : "Failed to load title"}
      </Text>
    );
  }

  const runtime = formatRuntime(media.runtime);
  const sublineParts = [
    media.certification,
    media.year,
    runtime,
    media.genres.slice(0, 3).join(", ") || undefined,
  ].filter((part): part is string => Boolean(part));

  const vote = formatVote(media.voteAverage);
  const ratingParts: MediaDetailRating[] = vote ? [{ label: "TMDb", value: vote }] : [];

  const directors = media.crew.filter((c) => c.job === "Director").map((c) => c.personName);
  const castAsMovieCredits: MovieCredit[] = media.cast.map((c) => ({
    id: c.id,
    type: "cast",
    personName: c.personName,
    character: c.character,
    order: c.order,
    headshotUrl: c.headshotUrl,
  }));

  return (
    <div className={classes.page}>
      <Stack gap="lg">
        <Group justify="flex-end">
          <DiscoverAddSplitButton
            mediaType={mediaType}
            onAdd={(targetInstanceId) =>
              openAdd({
                mediaType,
                tmdbId,
                titleHint: media.title,
                instanceId: targetInstanceId,
              })
            }
          />
        </Group>
        <MediaDetailHero
          title={title}
          posterUrl={media.posterUrl}
          overview={media.overview}
          sublineParts={sublineParts}
          ratingParts={ratingParts}
          links={media.links}
          hideMonitor
          hideTrailer={!media.trailerYouTubeId}
          youTubeTrailerId={media.trailerYouTubeId}
          meta={
            <>
              {media.tagline ? (
                <MetaRow label="Tagline" wide>
                  <Text size="sm" fs="italic">
                    {media.tagline}
                  </Text>
                </MetaRow>
              ) : null}
              {directors.length > 0 ? (
                <MetaRow label="Director" wide>
                  <Text size="sm">{directors.join(", ")}</Text>
                </MetaRow>
              ) : null}
              {media.creators.length > 0 ? (
                <MetaRow label="Created by" wide>
                  <Text size="sm">{media.creators.join(", ")}</Text>
                </MetaRow>
              ) : null}
              {media.studio ? (
                <MetaRow label="Studio">
                  <Text size="sm">{media.studio}</Text>
                </MetaRow>
              ) : null}
              {media.network ? (
                <MetaRow label="Network">
                  <Text size="sm">{media.network}</Text>
                </MetaRow>
              ) : null}
              {media.productionStatus ? (
                <MetaRow label="Status">
                  <Text size="sm">{media.productionStatus}</Text>
                </MetaRow>
              ) : null}
              {media.mediaAvailability ? (
                <MetaRow label="Availability">
                  <Text size="sm">
                    {media.mediaAvailability.charAt(0).toUpperCase() +
                      media.mediaAvailability.slice(1)}
                  </Text>
                </MetaRow>
              ) : null}
            </>
          }
        />
        {castAsMovieCredits.length > 0 ? (
          <MovieDetailCredits cast={castAsMovieCredits} crew={[]} />
        ) : null}
      </Stack>
    </div>
  );
}

export function DiscoverTitlePage() {
  return (
    <DiscoverAddProvider>
      <DiscoverTitleContent />
    </DiscoverAddProvider>
  );
}
