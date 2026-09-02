import {
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ArrKind,
  MovieIndexerFlagOption,
  MovieLanguageOption,
  MovieQualityOption,
  MovieReleaseLanguage,
  MovieReleaseQuality,
  QueueManualImportItem,
  QueueManualImportUpdateItem,
} from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import { getArtistAlbums, getArtistQualities, listArtists } from "@/api/artists";
import { getMovieIndexerFlags, getMovieLanguages, getMovieQualities, listMovies } from "@/api/movies";
import { getManualImport, postManualImport } from "@/api/queue";
import {
  getSeriesEpisodes,
  getSeriesIndexerFlags,
  getSeriesLanguages,
  getSeriesQualities,
  getSeriesSeasons,
  listShows,
} from "@/api/shows";
import { CheckboxMultiSelect } from "@/components/movies/CheckboxMultiSelect";
import { QualitySelectWithRevision } from "@/components/movies/QualitySelectWithRevision";
import { formatFreeSpace } from "@/lib/moviePath";
import classes from "./QueueManualImportModal.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  instanceId: string;
  kind: ArrKind;
  downloadId: string;
  title: string;
};

type QualityOption = Pick<MovieQualityOption, "id" | "name" | "source" | "resolution" | "modifier">;

type Draft = {
  id: number;
  path: string;
  relativePath: string;
  downloadId?: string;
  movieId: string | null;
  seriesId: string | null;
  seasonNumber: string | null;
  episodeIds: string[];
  artistId: string | null;
  albumId: string | null;
  releaseGroup: string;
  qualityId: string | null;
  proper: boolean;
  real: boolean;
  languageIds: string[];
  flagIds: string[];
  releaseType: string | null;
  rejections: string[];
};

const SONARR_RELEASE_TYPES = [
  { value: "unknown", label: "Unknown" },
  { value: "singleEpisode", label: "Single Episode" },
  { value: "multiEpisode", label: "Multi-Episode" },
  { value: "seasonPack", label: "Season Pack" },
];

function flagsToIds(mask: number, options: MovieIndexerFlagOption[]): string[] {
  return options.filter((flag) => (mask & flag.id) === flag.id && flag.id !== 0).map((flag) => String(flag.id));
}

function idsToFlags(ids: string[]): number {
  return ids.reduce((acc, id) => acc | Number(id), 0);
}

function toDraft(file: QueueManualImportItem, flagOptions: MovieIndexerFlagOption[]): Draft {
  return {
    id: file.id,
    path: file.path,
    relativePath: file.relativePath ?? file.name ?? file.path,
    downloadId: file.downloadId,
    movieId: file.movieId != null ? String(file.movieId) : null,
    seriesId: file.seriesId != null ? String(file.seriesId) : null,
    seasonNumber: file.seasonNumber != null ? String(file.seasonNumber) : null,
    episodeIds: file.episodeIds.map(String),
    artistId: file.artistId != null ? String(file.artistId) : null,
    albumId: file.albumId != null ? String(file.albumId) : null,
    releaseGroup: file.releaseGroup ?? "",
    qualityId: file.quality?.quality.id != null ? String(file.quality.quality.id) : null,
    proper: (file.quality?.revision.version ?? 1) > 1,
    real: (file.quality?.revision.real ?? 0) > 0,
    languageIds: file.languages.map((language) => String(language.id)),
    flagIds: flagsToIds(file.indexerFlags, flagOptions),
    releaseType: file.releaseType ?? null,
    rejections: file.rejections.map((r) => r.reason).filter((reason): reason is string => Boolean(reason)),
  };
}

function buildQuality(
  qualityId: string,
  qualities: QualityOption[],
  proper: boolean,
  real: boolean,
): MovieReleaseQuality | undefined {
  const option = qualities.find((quality) => String(quality.id) === qualityId);
  if (!option) return undefined;
  return {
    quality: {
      id: option.id,
      name: option.name,
      source: option.source,
      resolution: option.resolution,
      modifier: option.modifier,
    },
    revision: {
      version: proper ? 2 : 1,
      real: real ? 1 : 0,
      isRepack: false,
    },
  };
}

function SonarrTargetCells({
  instanceId,
  draft,
  seriesOptions,
  onChange,
}: {
  instanceId: string;
  draft: Draft;
  seriesOptions: Array<{ value: string; label: string }>;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const seriesId = draft.seriesId ? Number(draft.seriesId) : undefined;
  const seasonNumber = draft.seasonNumber != null ? Number(draft.seasonNumber) : undefined;

  const seasonsQuery = useQuery({
    queryKey: ["series-seasons", instanceId, seriesId],
    queryFn: () => getSeriesSeasons(instanceId, seriesId!),
    enabled: seriesId != null,
    staleTime: 60_000,
  });
  const episodesQuery = useQuery({
    queryKey: ["series-episodes", instanceId, seriesId, seasonNumber],
    queryFn: () => getSeriesEpisodes(instanceId, seriesId!, seasonNumber),
    enabled: seriesId != null,
    staleTime: 30_000,
  });

  const seasonOptions = (seasonsQuery.data?.seasons ?? []).map((season) => ({
    value: String(season.seasonNumber),
    label: season.seasonNumber === 0 ? "Specials" : `Season ${season.seasonNumber}`,
  }));
  const episodeOptions = (episodesQuery.data?.episodes ?? [])
    .filter((episode) => seasonNumber == null || episode.seasonNumber === seasonNumber)
    .map((episode) => ({
      value: String(episode.id),
      label: `${episode.seasonNumber}x${String(episode.episodeNumber).padStart(2, "0")} - ${episode.title}`,
    }));

  return (
    <>
      <Table.Td miw={180}>
        <Select
          size="xs"
          searchable
          clearable
          placeholder="Series"
          data={seriesOptions}
          value={draft.seriesId}
          onChange={(value) => onChange({ seriesId: value, seasonNumber: null, episodeIds: [] })}
        />
      </Table.Td>
      <Table.Td miw={120}>
        <Select
          size="xs"
          searchable
          clearable
          placeholder="Season"
          data={seasonOptions}
          value={draft.seasonNumber}
          disabled={seriesId == null}
          onChange={(value) => onChange({ seasonNumber: value, episodeIds: [] })}
        />
      </Table.Td>
      <Table.Td miw={180}>
        <CheckboxMultiSelect
          options={episodeOptions}
          value={draft.episodeIds}
          placeholder="Episodes"
          multiLabel="Multiple"
          searchPlaceholder="Search episodes"
          disabled={seriesId == null}
          onChange={(value) => onChange({ episodeIds: value })}
        />
      </Table.Td>
    </>
  );
}

function LidarrTargetCells({
  instanceId,
  draft,
  artistOptions,
  onChange,
}: {
  instanceId: string;
  draft: Draft;
  artistOptions: Array<{ value: string; label: string }>;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const artistId = draft.artistId ? Number(draft.artistId) : undefined;
  const albumsQuery = useQuery({
    queryKey: ["artist-albums", instanceId, artistId],
    queryFn: () => getArtistAlbums(instanceId, artistId!),
    enabled: artistId != null,
    staleTime: 60_000,
  });
  const albumOptions = (albumsQuery.data?.groups ?? []).flatMap((group) =>
    group.albums.map((album) => ({
      value: String(album.id),
      label: album.title,
    })),
  );

  return (
    <>
      <Table.Td miw={180}>
        <Select
          size="xs"
          searchable
          clearable
          placeholder="Artist"
          data={artistOptions}
          value={draft.artistId}
          onChange={(value) => onChange({ artistId: value, albumId: null })}
        />
      </Table.Td>
      <Table.Td miw={180}>
        <Select
          size="xs"
          searchable
          clearable
          placeholder="Album"
          data={albumOptions}
          value={draft.albumId}
          disabled={artistId == null}
          onChange={(value) => onChange({ albumId: value })}
        />
      </Table.Td>
    </>
  );
}

export function QueueManualImportModal({
  opened,
  onClose,
  instanceId,
  kind,
  downloadId,
  title,
}: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});

  const filesQuery = useQuery({
    queryKey: ["queue-manualimport", instanceId, downloadId],
    queryFn: () => getManualImport(instanceId, { downloadId }),
    enabled: opened && Boolean(downloadId),
  });

  const moviesQuery = useQuery({
    queryKey: ["movies", instanceId],
    queryFn: () => listMovies(instanceId),
    enabled: opened && kind === "radarr",
    staleTime: 60_000,
  });
  const showsQuery = useQuery({
    queryKey: ["shows", instanceId],
    queryFn: () => listShows(instanceId),
    enabled: opened && kind === "sonarr",
    staleTime: 60_000,
  });
  const artistsQuery = useQuery({
    queryKey: ["artists", instanceId],
    queryFn: () => listArtists(instanceId),
    enabled: opened && kind === "lidarr",
    staleTime: 60_000,
  });

  const qualitiesQuery = useQuery({
    queryKey: ["queue-qualities", instanceId, kind],
    queryFn: () => {
      if (kind === "radarr") return getMovieQualities(instanceId);
      if (kind === "sonarr") return getSeriesQualities(instanceId);
      return getArtistQualities(instanceId);
    },
    enabled: opened,
    staleTime: 5 * 60_000,
  });

  const languagesQuery = useQuery({
    queryKey: ["queue-languages", instanceId, kind],
    queryFn: () =>
      kind === "radarr" ? getMovieLanguages(instanceId) : getSeriesLanguages(instanceId),
    enabled: opened && kind !== "lidarr",
    staleTime: 5 * 60_000,
  });

  const flagsQuery = useQuery({
    queryKey: ["queue-flags", instanceId, kind],
    queryFn: () =>
      kind === "radarr" ? getMovieIndexerFlags(instanceId) : getSeriesIndexerFlags(instanceId),
    enabled: opened && kind !== "lidarr",
    staleTime: 5 * 60_000,
  });

  const qualities = (qualitiesQuery.data?.qualities ?? []) as QualityOption[];
  const languages = (languagesQuery.data?.languages ?? []) as MovieLanguageOption[];
  const flagOptions = (flagsQuery.data?.flags ?? []) as MovieIndexerFlagOption[];

  useEffect(() => {
    if (!opened || !filesQuery.data?.files) return;
    const flags = flagsQuery.data?.flags ?? [];
    const next: Record<number, Draft> = {};
    const sel: Record<number, boolean> = {};
    for (const file of filesQuery.data.files) {
      next[file.id] = toDraft(file, flags);
      sel[file.id] = true;
    }
    setDrafts(next);
    setSelected(sel);
  }, [opened, filesQuery.data, flagsQuery.data?.flags]);

  const movieOptions = useMemo(
    () =>
      (moviesQuery.data?.movies ?? []).map((movie) => ({
        value: String(movie.externalId),
        label: movie.year ? `${movie.title} (${movie.year})` : movie.title,
      })),
    [moviesQuery.data?.movies],
  );
  const seriesOptions = useMemo(
    () =>
      (showsQuery.data?.series ?? []).map((series) => ({
        value: String(series.externalId),
        label: series.year ? `${series.title} (${series.year})` : series.title,
      })),
    [showsQuery.data?.series],
  );
  const artistOptions = useMemo(
    () =>
      (artistsQuery.data?.artists ?? []).map((artist) => ({
        value: String(artist.externalId),
        label: artist.title,
      })),
    [artistsQuery.data?.artists],
  );

  const qualityOptions = useMemo(
    () => qualities.map((quality) => ({ value: String(quality.id), label: quality.name })),
    [qualities],
  );
  const languageOptions = useMemo(
    () => languages.map((language) => ({ value: String(language.id), label: language.name })),
    [languages],
  );
  const flagSelectOptions = useMemo(
    () => flagOptions.map((flag) => ({ value: String(flag.id), label: flag.name })),
    [flagOptions],
  );

  const files = filesQuery.data?.files ?? [];
  const selectedIds = Object.entries(selected)
    .filter(([, checked]) => checked)
    .map(([id]) => Number(id));

  function updateDraft(id: number, patch: Partial<Draft>) {
    setDrafts((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, ...patch } };
    });
  }

  const importMutation = useMutation({
    mutationFn: async () => {
      const updateFiles: QueueManualImportUpdateItem[] = selectedIds.map((id) => {
        const draft = drafts[id]!;
        const quality =
          draft.qualityId != null
            ? buildQuality(draft.qualityId, qualities, draft.proper, draft.real)
            : undefined;
        const selectedLanguages: MovieReleaseLanguage[] = languages
          .filter((language) => draft.languageIds.includes(String(language.id)))
          .map((language) => ({ id: language.id, name: language.name }));
        return {
          id: draft.id,
          path: draft.path,
          downloadId: draft.downloadId,
          movieId: draft.movieId ? Number(draft.movieId) : undefined,
          seriesId: draft.seriesId ? Number(draft.seriesId) : undefined,
          seasonNumber: draft.seasonNumber != null ? Number(draft.seasonNumber) : undefined,
          episodeIds: kind === "sonarr" ? draft.episodeIds.map(Number) : undefined,
          artistId: draft.artistId ? Number(draft.artistId) : undefined,
          albumId: draft.albumId ? Number(draft.albumId) : undefined,
          quality,
          languages: kind === "lidarr" ? undefined : selectedLanguages,
          releaseGroup: draft.releaseGroup,
          indexerFlags: kind === "lidarr" ? undefined : idsToFlags(draft.flagIds),
          releaseType: kind === "sonarr" ? (draft.releaseType ?? undefined) : undefined,
        };
      });
      await postManualImport(instanceId, { files: updateFiles });
    },
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Manual import queued in Arr" });
      await queryClient.invalidateQueries({ queryKey: ["queue", instanceId] });
      onClose();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Import failed",
      });
    },
  });

  const loading = filesQuery.isLoading || qualitiesQuery.isLoading;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size="95%"
      centered
      styles={{ content: { maxWidth: 1400 } }}
    >
      {loading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : (
        <Stack gap="md">
          {files.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="xl">
              No importable files found for this download.
            </Text>
          ) : (
            <div className={classes.tableWrap}>
              <ScrollArea.Autosize mah="60vh" type="auto" offsetScrollbars>
                <Table striped highlightOnHover horizontalSpacing="sm" verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={40}>
                        <Checkbox
                          aria-label="Select all files"
                          checked={selectedIds.length === files.length}
                          indeterminate={selectedIds.length > 0 && selectedIds.length < files.length}
                          onChange={(e) => {
                            const checked = e.currentTarget.checked;
                            const next: Record<number, boolean> = {};
                            for (const file of files) next[file.id] = checked;
                            setSelected(next);
                          }}
                        />
                      </Table.Th>
                      <Table.Th>Relative Path</Table.Th>
                      {kind === "radarr" ? <Table.Th>Movie</Table.Th> : null}
                      {kind === "sonarr" ? (
                        <>
                          <Table.Th>Series</Table.Th>
                          <Table.Th>Season</Table.Th>
                          <Table.Th>Episodes</Table.Th>
                        </>
                      ) : null}
                      {kind === "lidarr" ? (
                        <>
                          <Table.Th>Artist</Table.Th>
                          <Table.Th>Album</Table.Th>
                        </>
                      ) : null}
                      <Table.Th>Quality</Table.Th>
                      {kind !== "lidarr" ? <Table.Th>Languages</Table.Th> : null}
                      {kind !== "lidarr" ? <Table.Th>Indexer Flags</Table.Th> : null}
                      {kind === "sonarr" ? <Table.Th>Release Type</Table.Th> : null}
                      <Table.Th>Release Group</Table.Th>
                      <Table.Th>Size</Table.Th>
                      <Table.Th>Issues</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {files.map((file) => {
                      const draft = drafts[file.id];
                      if (!draft) return null;
                      return (
                        <Table.Tr key={file.id}>
                          <Table.Td>
                            <Checkbox
                              checked={Boolean(selected[file.id])}
                              aria-label={`Select ${draft.relativePath}`}
                              onChange={(e) =>
                                setSelected((prev) => ({
                                  ...prev,
                                  [file.id]: e.currentTarget.checked,
                                }))
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" className={classes.path}>
                              {draft.relativePath}
                            </Text>
                          </Table.Td>
                          {kind === "radarr" ? (
                            <Table.Td miw={180}>
                              <Select
                                size="xs"
                                searchable
                                clearable
                                placeholder="Movie"
                                data={movieOptions}
                                value={draft.movieId}
                                onChange={(value) => updateDraft(file.id, { movieId: value })}
                              />
                            </Table.Td>
                          ) : null}
                          {kind === "sonarr" ? (
                            <SonarrTargetCells
                              instanceId={instanceId}
                              draft={draft}
                              seriesOptions={seriesOptions}
                              onChange={(patch) => updateDraft(file.id, patch)}
                            />
                          ) : null}
                          {kind === "lidarr" ? (
                            <LidarrTargetCells
                              instanceId={instanceId}
                              draft={draft}
                              artistOptions={artistOptions}
                              onChange={(patch) => updateDraft(file.id, patch)}
                            />
                          ) : null}
                          <Table.Td miw={200}>
                            <QualitySelectWithRevision
                              options={qualityOptions}
                              value={draft.qualityId}
                              proper={draft.proper}
                              real={draft.real}
                              onQualityChange={(value) => updateDraft(file.id, { qualityId: value })}
                              onProperChange={(value) => updateDraft(file.id, { proper: value })}
                              onRealChange={(value) => updateDraft(file.id, { real: value })}
                            />
                          </Table.Td>
                          {kind !== "lidarr" ? (
                            <Table.Td miw={160}>
                              <CheckboxMultiSelect
                                options={languageOptions}
                                value={draft.languageIds}
                                placeholder="Languages"
                                multiLabel="Multi-Language"
                                searchPlaceholder="Search languages"
                                onChange={(value) => updateDraft(file.id, { languageIds: value })}
                              />
                            </Table.Td>
                          ) : null}
                          {kind !== "lidarr" ? (
                            <Table.Td miw={140}>
                              <CheckboxMultiSelect
                                options={flagSelectOptions}
                                value={draft.flagIds}
                                placeholder="Flags"
                                multiLabel="Multiple flags"
                                searchPlaceholder="Search flags"
                                onChange={(value) => updateDraft(file.id, { flagIds: value })}
                              />
                            </Table.Td>
                          ) : null}
                          {kind === "sonarr" ? (
                            <Table.Td miw={140}>
                              <Select
                                size="xs"
                                allowDeselect={false}
                                data={SONARR_RELEASE_TYPES}
                                value={draft.releaseType ?? "unknown"}
                                onChange={(value) => updateDraft(file.id, { releaseType: value })}
                              />
                            </Table.Td>
                          ) : null}
                          <Table.Td miw={120}>
                            <TextInput
                              size="xs"
                              value={draft.releaseGroup}
                              placeholder="Release group"
                              onChange={(e) =>
                                updateDraft(file.id, { releaseGroup: e.currentTarget.value })
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                              {file.size != null ? formatFreeSpace(file.size) : "—"}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c={draft.rejections.length ? "red" : "dimmed"}>
                              {draft.rejections[0] ?? "—"}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>
            </div>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={importMutation.isPending}>
              Cancel
            </Button>
            <Button
              color="teal"
              disabled={selectedIds.length === 0}
              loading={importMutation.isPending}
              onClick={() => importMutation.mutate()}
            >
              Import
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
