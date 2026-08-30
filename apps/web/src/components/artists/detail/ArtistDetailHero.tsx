import { Badge, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArtistPageDetail } from "@umbrellarr/shared";
import { useMemo } from "react";
import { getArtistLinks, updateArtist } from "@/api/artists";
import {
  MediaDetailHero,
  MetaRow,
  type MediaDetailRating,
} from "@/components/media/detail/MediaDetailHero";
import mediaClasses from "@/components/media/detail/MediaDetailHero.module.css";
import { formatFreeSpace } from "@/lib/moviePath";
import { ARTIST_POSTER_STATUS_LABELS } from "@/lib/posterStatusLabels";

const availabilityLabel = ARTIST_POSTER_STATUS_LABELS;

function formatRating(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

export function ArtistDetailHero({ artist }: { artist: ArtistPageDetail }) {
  const queryClient = useQueryClient();
  const size =
    artist.sizeOnDisk != null && artist.sizeOnDisk > 0
      ? formatFreeSpace(artist.sizeOnDisk)
      : undefined;
  const artistQueryKey = ["artist", artist.instanceId, artist.externalId] as const;
  const trackProgress =
    artist.trackCount != null && artist.trackCount > 0
      ? `${artist.trackFileCount ?? 0} / ${artist.trackCount}`
      : undefined;

  const linksQuery = useQuery({
    queryKey: ["artist-links", artist.instanceId, artist.externalId],
    queryFn: () => getArtistLinks(artist.instanceId, artist.externalId),
    staleTime: 60_000,
  });

  const monitorMutation = useMutation({
    mutationFn: () =>
      updateArtist(artist.instanceId, artist.externalId, {
        monitored: !artist.monitored,
        monitorNewItems: artist.monitorNewItems,
        qualityProfileId: artist.qualityProfileId,
        metadataProfileId: artist.metadataProfileId,
        path: artist.path,
        tagIds: artist.tagIds,
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: artistQueryKey });
      const previous = queryClient.getQueryData<ArtistPageDetail>(artistQueryKey);
      if (previous) {
        queryClient.setQueryData<ArtistPageDetail>(artistQueryKey, {
          ...previous,
          monitored: !previous.monitored,
        });
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(artistQueryKey, context.previous);
      }
      const wasMonitored = context?.previous?.monitored ?? artist.monitored;
      notifications.show({
        color: "red",
        title: wasMonitored ? "Could not unmonitor" : "Could not monitor",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: artistQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["artists"] });
    },
  });

  const albumsPart =
    artist.albumCount != null
      ? `${artist.albumCount} ${artist.albumCount === 1 ? "album" : "albums"}`
      : undefined;
  const tracksPart = trackProgress ? `${trackProgress} tracks` : undefined;

  const sublineParts = [
    artist.status ? artist.status : undefined,
    albumsPart,
    tracksPart,
    artist.genres[0],
  ].filter((part): part is string => Boolean(part));

  const ratingParts = useMemo((): MediaDetailRating[] => {
    if (artist.rating == null) return [];
    return [{ label: "★", value: formatRating(artist.rating) }];
  }, [artist.rating]);

  const links = useMemo(() => linksQuery.data?.links ?? [], [linksQuery.data?.links]);

  return (
    <MediaDetailHero
      title={artist.title}
      posterUrl={artist.posterUrl}
      overview={artist.overview}
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
      monitored={artist.monitored}
      monitorPending={monitorMutation.isPending}
      onToggleMonitor={() => monitorMutation.mutate()}
      hideTrailer
      meta={
        <>
          {artist.path && (
            <MetaRow label="Path" wide>
              <Text size="sm" className={mediaClasses.path}>
                {artist.path}
              </Text>
            </MetaRow>
          )}
          <MetaRow label="Status">{availabilityLabel[artist.availability]}</MetaRow>
          {artist.qualityProfileName && (
            <MetaRow label="Quality">{artist.qualityProfileName}</MetaRow>
          )}
          {artist.metadataProfileName && (
            <MetaRow label="Metadata">{artist.metadataProfileName}</MetaRow>
          )}
          {size && <MetaRow label="Size">{size}</MetaRow>}
          {artist.status && (
            <MetaRow label="Artist status">
              <Text size="sm" tt="capitalize">
                {artist.status}
              </Text>
            </MetaRow>
          )}
          {artist.genres.length > 0 && (
            <MetaRow label="Genres" wide>
              <Group gap={6}>
                {artist.genres.map((genre) => (
                  <Badge key={genre} size="sm" variant="light" color="gray">
                    {genre}
                  </Badge>
                ))}
              </Group>
            </MetaRow>
          )}
          {artist.tags.length > 0 && (
            <MetaRow label="Tags" wide>
              <Group gap={6}>
                {artist.tags.map((tag) => (
                  <Badge key={tag} size="sm" variant="light" color="violet">
                    {tag}
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
