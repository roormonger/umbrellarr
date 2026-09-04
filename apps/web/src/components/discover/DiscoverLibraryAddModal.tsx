import { Alert, Group, Loader, Modal, Select, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { MovieLookupItem, SeriesLookupItem } from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import { listInstances } from "@/api/instances";
import { lookupMovies } from "@/api/movies";
import { lookupSeries } from "@/api/shows";
import { APP_LOADER_SIZE } from "@/components/QuantumLoader";
import { MovieAddForm } from "@/components/movies/MovieAddSearchModal";
import { ShowAddForm } from "@/components/shows/ShowAddSearchModal";
import { pickInstanceId, setLastInstanceId } from "@/lib/lastInstance";

type Props = {
  opened: boolean;
  mediaType: "movie" | "tv";
  tmdbId: number;
  titleHint?: string;
  /** When set, use this Arr instance and hide the in-modal picker. */
  initialInstanceId?: string;
  onClose: () => void;
};

function movieTitle(movie: MovieLookupItem): string {
  return movie.year ? `${movie.title} (${movie.year})` : movie.title;
}

function seriesTitle(series: SeriesLookupItem): string {
  return series.year ? `${series.title} (${series.year})` : series.title;
}

function pickMovieResult(results: MovieLookupItem[], tmdbId: number): MovieLookupItem | null {
  return results.find((item) => item.tmdbId === tmdbId) ?? results[0] ?? null;
}

function pickSeriesResult(results: SeriesLookupItem[], tmdbId: number): SeriesLookupItem | null {
  return results.find((item) => item.tmdbId === tmdbId) ?? results[0] ?? null;
}

export function DiscoverLibraryAddModal({
  opened,
  mediaType,
  tmdbId,
  titleHint,
  initialInstanceId,
  onClose,
}: Props) {
  const navigate = useNavigate();
  const targetKind = mediaType === "movie" ? "radarr" : "sonarr";
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [handledInLibraryKey, setHandledInLibraryKey] = useState<string | null>(null);
  const lockedToInitial = Boolean(initialInstanceId);

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
    enabled: opened,
  });

  const targetInstances = useMemo(
    () => (instancesQuery.data?.instances ?? []).filter((i) => i.kind === targetKind),
    [instancesQuery.data?.instances, targetKind],
  );

  useEffect(() => {
    if (!opened) {
      setInstanceId(null);
      setHandledInLibraryKey(null);
      return;
    }
    const preferred =
      (initialInstanceId && targetInstances.some((i) => i.id === initialInstanceId)
        ? initialInstanceId
        : null) ??
      pickInstanceId(targetKind, targetInstances) ??
      targetInstances[0]?.id ??
      null;
    setInstanceId(preferred);
    if (preferred) setLastInstanceId(targetKind, preferred);
  }, [opened, targetInstances, initialInstanceId, targetKind]);

  const activeInstanceId = instanceId ?? targetInstances[0]?.id ?? null;
  const lookupTerm = `tmdb:${tmdbId}`;

  const movieLookupQuery = useQuery({
    queryKey: ["movie-lookup", activeInstanceId, lookupTerm],
    queryFn: () => lookupMovies(activeInstanceId!, lookupTerm),
    enabled: opened && mediaType === "movie" && Boolean(activeInstanceId),
  });

  const seriesLookupQuery = useQuery({
    queryKey: ["series-lookup", activeInstanceId, lookupTerm],
    queryFn: () => lookupSeries(activeInstanceId!, lookupTerm),
    enabled: opened && mediaType === "tv" && Boolean(activeInstanceId),
  });

  const movie = useMemo(
    () =>
      mediaType === "movie"
        ? pickMovieResult(movieLookupQuery.data?.results ?? [], tmdbId)
        : null,
    [mediaType, movieLookupQuery.data?.results, tmdbId],
  );

  const series = useMemo(
    () =>
      mediaType === "tv"
        ? pickSeriesResult(seriesLookupQuery.data?.results ?? [], tmdbId)
        : null,
    [mediaType, seriesLookupQuery.data?.results, tmdbId],
  );

  useEffect(() => {
    if (!opened || !activeInstanceId) return;

    if (mediaType === "movie" && movie?.inLibrary && movie.externalId != null) {
      const key = `movie:${activeInstanceId}:${movie.externalId}`;
      if (handledInLibraryKey === key) return;
      setHandledInLibraryKey(key);
      notifications.show({
        color: "teal",
        message: `“${movie.title}” is already in your library`,
      });
      onClose();
      void navigate({
        to: "/movies/$instanceId/$movieId",
        params: { instanceId: activeInstanceId, movieId: String(movie.externalId) },
      });
      return;
    }

    if (mediaType === "tv" && series?.inLibrary && series.externalId != null) {
      const key = `tv:${activeInstanceId}:${series.externalId}`;
      if (handledInLibraryKey === key) return;
      setHandledInLibraryKey(key);
      notifications.show({
        color: "teal",
        message: `“${series.title}” is already in your library`,
      });
      onClose();
      void navigate({
        to: "/shows/$instanceId/$seriesId",
        params: { instanceId: activeInstanceId, seriesId: String(series.externalId) },
      });
    }
  }, [
    opened,
    activeInstanceId,
    mediaType,
    movie,
    series,
    handledInLibraryKey,
    navigate,
    onClose,
  ]);

  const lookupLoading =
    mediaType === "movie" ? movieLookupQuery.isLoading : seriesLookupQuery.isLoading;
  const lookupError =
    mediaType === "movie" ? movieLookupQuery.error : seriesLookupQuery.error;
  const lookupReady = mediaType === "movie" ? movieLookupQuery.isSuccess : seriesLookupQuery.isSuccess;

  const modalTitle =
    mediaType === "movie" && movie && !movie.inLibrary
      ? movieTitle(movie)
      : mediaType === "tv" && series && !series.inLibrary
        ? seriesTitle(series)
        : titleHint
          ? `Add ${titleHint}`
          : mediaType === "movie"
            ? "Add to Radarr"
            : "Add to Sonarr";

  const kindLabel = mediaType === "movie" ? "Radarr" : "Sonarr";
  const showForm =
    Boolean(activeInstanceId) &&
    ((mediaType === "movie" && movie != null && !movie.inLibrary) ||
      (mediaType === "tv" && series != null && !series.inLibrary));

  return (
    <Modal opened={opened} onClose={onClose} title={modalTitle} size="xl" centered>
      <Stack gap="md">
        {instancesQuery.isLoading ? (
          <Group justify="center" py="xl">
            <Loader size={APP_LOADER_SIZE} />
          </Group>
        ) : targetInstances.length === 0 ? (
          <Alert color="gray" title={`No ${kindLabel} instance`}>
            Add a {kindLabel} instance in Settings to add this title to your library.
          </Alert>
        ) : (
          <>
            {targetInstances.length > 1 && !lockedToInitial ? (
              <Select
                label={kindLabel}
                data={targetInstances.map((i) => ({ value: i.id, label: i.name }))}
                value={activeInstanceId}
                onChange={(value) => {
                  setHandledInLibraryKey(null);
                  setInstanceId(value);
                  if (value) setLastInstanceId(targetKind, value);
                }}
                allowDeselect={false}
              />
            ) : null}

            {lookupLoading ? (
              <Group justify="center" py="xl">
                <Loader size={APP_LOADER_SIZE} />
              </Group>
            ) : null}

            {lookupError ? (
              <Text c="red" size="sm">
                {lookupError instanceof Error ? lookupError.message : "Lookup failed"}
              </Text>
            ) : null}

            {lookupReady && !lookupLoading && !showForm && !movie?.inLibrary && !series?.inLibrary ? (
              <Text c="dimmed" size="sm">
                No matching title found in {kindLabel} for TMDB {tmdbId}.
              </Text>
            ) : null}

            {showForm && mediaType === "movie" && movie && activeInstanceId ? (
              <MovieAddForm instanceId={activeInstanceId} movie={movie} onClose={onClose} />
            ) : null}

            {showForm && mediaType === "tv" && series && activeInstanceId ? (
              <ShowAddForm instanceId={activeInstanceId} series={series} onClose={onClose} />
            ) : null}
          </>
        )}
      </Stack>
    </Modal>
  );
}
