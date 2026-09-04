import {
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  MOVIE_MINIMUM_AVAILABILITY_OPTIONS,
  type MovieAddRequest,
  type MovieLookupItem,
  type MovieMinimumAvailability,
} from "@umbrellarr/shared";
import { useMemo, useState } from "react";
import { addMovie, getMovieEditOptions, lookupMovies } from "@/api/movies";
import formClasses from "@/components/media/ArrAddForm.module.css";
import { joinMoviePath, rootFolderLabel } from "@/lib/moviePath";
import classes from "./MovieAddSearchModal.module.css";

type Props = {
  opened: boolean;
  instanceId: string;
  onClose: () => void;
};

function suggestedFolder(movie: MovieLookupItem): string {
  if (movie.folder) {
    return movie.folder.startsWith("/") ? movie.folder : `/${movie.folder}`;
  }
  const year = movie.year ? ` (${movie.year})` : "";
  return `/${movie.title}${year}`;
}

function formatLookupRating(value: number, percent: boolean): string {
  if (percent) return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}%`;
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function ratingLine(movie: MovieLookupItem): string | undefined {
  const parts: string[] = [];
  if (movie.tmdbRating != null) parts.push(`TMDb ${formatLookupRating(movie.tmdbRating, false)}`);
  if (movie.imdbRating != null) parts.push(`IMDb ${formatLookupRating(movie.imdbRating, false)}`);
  if (movie.tomatoRating != null) parts.push(`RT ${formatLookupRating(movie.tomatoRating, true)}`);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function movieTitle(movie: MovieLookupItem): string {
  return movie.year ? `${movie.title} (${movie.year})` : movie.title;
}

export function MovieAddSearchModal({ opened, instanceId, onClose }: Props) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [debouncedTerm] = useDebouncedValue(term, 300);
  const [selected, setSelected] = useState<MovieLookupItem | null>(null);

  const lookupTerm = debouncedTerm.trim();
  const lookupQuery = useQuery({
    queryKey: ["movie-lookup", instanceId, lookupTerm],
    queryFn: () => lookupMovies(instanceId, lookupTerm),
    enabled: opened && !selected && lookupTerm.length > 0,
    placeholderData: keepPreviousData,
  });

  function handleClose() {
    setTerm("");
    setSelected(null);
    onClose();
  }

  function handlePick(movie: MovieLookupItem) {
    if (movie.inLibrary && movie.externalId != null) {
      handleClose();
      void navigate({
        to: "/movies/$instanceId/$movieId",
        params: { instanceId, movieId: String(movie.externalId) },
      });
      return;
    }
    setSelected(movie);
  }

  const results = lookupQuery.data?.results ?? [];
  const adding = selected != null && !selected.inLibrary;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={adding && selected ? movieTitle(selected) : "Add New Movie"}
      size="xl"
      centered
    >
      {adding && selected ? (
        <MovieAddForm
          instanceId={instanceId}
          movie={selected}
          onBack={() => setSelected(null)}
          onClose={handleClose}
        />
      ) : (
        <Stack gap="md">
          <TextInput
            placeholder="Search movies…"
            leftSection={<MagnifyingGlassIcon />}
            value={term}
            onChange={(e) => setTerm(e.currentTarget.value)}
            autoFocus
          />

          {!lookupTerm && (
            <Text c="dimmed" size="sm">
              Type a title to search Radarr.
            </Text>
          )}

          {lookupTerm && lookupQuery.isFetching && results.length === 0 && (
            <Group justify="center" py="xl">
              <Loader size="lg" />
            </Group>
          )}

          {lookupTerm && lookupQuery.error && (
            <Text c="red" size="sm">
              {lookupQuery.error instanceof Error
                ? lookupQuery.error.message
                : "Lookup failed"}
            </Text>
          )}

          {lookupTerm && lookupQuery.isSuccess && !lookupQuery.isFetching && results.length === 0 && (
            <Text c="dimmed" size="sm">
              No matches.
            </Text>
          )}

          {lookupTerm && results.length > 0 && (
            <div className={classes.results}>
              {results.map((movie) => (
                <LookupResultRow
                  key={movie.tmdbId}
                  movie={movie}
                  onPick={() => handlePick(movie)}
                />
              ))}
            </div>
          )}
        </Stack>
      )}
    </Modal>
  );
}

function LookupResultRow({
  movie,
  onPick,
}: {
  movie: MovieLookupItem;
  onPick: () => void;
}) {
  const ratings = ratingLine(movie);
  const genres = movie.genres.length > 0 ? movie.genres.slice(0, 4).join(", ") : undefined;

  return (
    <UnstyledButton className={classes.row} onClick={onPick} data-tmdb-id={movie.tmdbId}>
      {movie.posterUrl ? (
        <img className={classes.poster} src={movie.posterUrl} alt="" />
      ) : (
        <div className={classes.poster} />
      )}
      <div className={classes.meta}>
        <div className={classes.titleRow}>
          <Text fw={600} lineClamp={1}>
            {movie.title}
          </Text>
          {movie.year != null && <span className={classes.year}>{movie.year}</span>}
          {movie.inLibrary && (
            <Badge size="xs" variant="light" color="teal">
              In Library
            </Badge>
          )}
        </div>
        {ratings && <div className={classes.ratings}>{ratings}</div>}
        {genres && <div className={classes.genres}>{genres}</div>}
        {movie.overview && (
          <Text className={classes.overview} c="dimmed" lineClamp={2}>
            {movie.overview}
          </Text>
        )}
      </div>
    </UnstyledButton>
  );
}

function folderLabel(movie: MovieLookupItem): string {
  return suggestedFolder(movie).replace(/^\/+/, "");
}

export function MovieAddForm({
  instanceId,
  movie,
  onBack,
  onClose,
}: {
  instanceId: string;
  movie: MovieLookupItem;
  /** When omitted, the Back control is hidden (Discover pre-seeded add). */
  onBack?: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const optionsQuery = useQuery({
    queryKey: ["movie-options", instanceId],
    queryFn: () => getMovieEditOptions(instanceId),
    staleTime: 5 * 60_000,
  });

  const [monitored, setMonitored] = useState(true);
  const [minimumAvailability, setMinimumAvailability] =
    useState<MovieMinimumAvailability>("released");
  const [qualityProfileId, setQualityProfileId] = useState<string | null>(null);
  const [rootFolderPath, setRootFolderPath] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [searchForMovie, setSearchForMovie] = useState(true);
  const folder = folderLabel(movie);

  const profileOptions = useMemo(
    () =>
      (optionsQuery.data?.qualityProfiles ?? []).map((p) => ({
        value: String(p.id),
        label: p.name,
      })),
    [optionsQuery.data?.qualityProfiles],
  );

  const tagOptions = useMemo(
    () =>
      (optionsQuery.data?.tags ?? []).map((t) => ({
        value: String(t.id),
        label: t.label,
      })),
    [optionsQuery.data?.tags],
  );

  const rootOptions = useMemo(
    () =>
      (optionsQuery.data?.rootFolders ?? []).map((r) => {
        const root = r.path.replace(/\/+$/, "") || "/";
        const full = joinMoviePath(root, folder);
        return {
          value: root,
          label: rootFolderLabel(full, r.freeSpace),
        };
      }),
    [optionsQuery.data?.rootFolders, folder],
  );

  const defaultProfileId =
    optionsQuery.data?.qualityProfiles[0] != null
      ? String(optionsQuery.data.qualityProfiles[0].id)
      : null;
  const defaultRootPath = optionsQuery.data?.rootFolders[0]
    ? optionsQuery.data.rootFolders[0].path.replace(/\/+$/, "") || "/"
    : null;
  const selectedProfileId = qualityProfileId ?? defaultProfileId;
  const selectedRootPath = rootFolderPath ?? defaultRootPath;

  const addMutation = useMutation({
    mutationFn: (body: MovieAddRequest) => addMovie(instanceId, body),
    onSuccess: async (detail) => {
      notifications.show({
        color: "green",
        message: `Added “${detail.title}” to Radarr`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["movies"] }),
        queryClient.invalidateQueries({ queryKey: ["discover"] }),
      ]);
      onClose();
      void navigate({
        to: "/movies/$instanceId/$movieId",
        params: { instanceId, movieId: String(detail.externalId) },
      });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Add failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const joinedPath =
    selectedRootPath && folder ? joinMoviePath(selectedRootPath, folder) : "";
  const canAdd = Boolean(selectedProfileId && selectedRootPath && folder);
  const loading = optionsQuery.isLoading;

  return (
    <Stack gap={0}>
      {loading && (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      )}

      {optionsQuery.error && (
        <Text c="red" size="sm" mb="md">
          {optionsQuery.error instanceof Error
            ? optionsQuery.error.message
            : "Failed to load options"}
        </Text>
      )}

      {!loading && optionsQuery.data && (
        <>
          <div className={formClasses.layout}>
            {movie.posterUrl ? (
              <img className={formClasses.poster} src={movie.posterUrl} alt="" />
            ) : (
              <div className={formClasses.poster} />
            )}
            <div className={formClasses.main}>
              {movie.overview && (
                <Text className={formClasses.overview} lineClamp={6}>
                  {movie.overview}
                </Text>
              )}
              <div className={formClasses.fields}>
                <div className={formClasses.row}>
                  <div className={formClasses.label}>Root Folder</div>
                  <div className={formClasses.control}>
                    <Select
                      aria-label="Root folder"
                      data={rootOptions}
                      value={selectedRootPath}
                      onChange={setRootFolderPath}
                      allowDeselect={false}
                      searchable={false}
                    />
                    <div className={formClasses.hint}>
                      &apos;{folder}&apos; subfolder will be created automatically
                    </div>
                  </div>
                </div>

                <div className={formClasses.row}>
                  <div className={formClasses.label}>Monitor</div>
                  <div className={formClasses.control}>
                    <Checkbox
                      label="Monitored"
                      description="Download movie if available"
                      checked={monitored}
                      onChange={(e) => {
                        const next = e.currentTarget.checked;
                        setMonitored(next);
                        if (next && minimumAvailability === "tba") {
                          setMinimumAvailability("released");
                        }
                      }}
                    />
                  </div>
                </div>

                <div className={formClasses.row}>
                  <div className={formClasses.label}>Minimum Availability</div>
                  <div className={formClasses.control}>
                    <Select
                      aria-label="Minimum Availability"
                      data={MOVIE_MINIMUM_AVAILABILITY_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                      value={monitored ? minimumAvailability : null}
                      placeholder="Not used when unmonitored"
                      onChange={(value) => {
                        if (value) setMinimumAvailability(value as MovieMinimumAvailability);
                      }}
                      allowDeselect={false}
                      disabled={!monitored}
                    />
                  </div>
                </div>

                <div className={formClasses.row}>
                  <div className={formClasses.label}>Quality Profile</div>
                  <div className={formClasses.control}>
                    <Select
                      aria-label="Quality Profile"
                      data={profileOptions}
                      value={selectedProfileId}
                      onChange={setQualityProfileId}
                      allowDeselect={false}
                      searchable
                    />
                  </div>
                </div>

                <div className={formClasses.row}>
                  <div className={formClasses.label}>Tags</div>
                  <div className={formClasses.control}>
                    <MultiSelect
                      aria-label="Tags"
                      data={tagOptions}
                      value={tagIds}
                      onChange={setTagIds}
                      searchable
                      clearable
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={formClasses.footer}>
            <div className={formClasses.footerStart}>
              {onBack ? (
                <Button
                  variant="default"
                  leftSection={<ArrowLeftIcon size={16} />}
                  onClick={onBack}
                  disabled={addMutation.isPending}
                >
                  Back
                </Button>
              ) : (
                <Button variant="default" onClick={onClose} disabled={addMutation.isPending}>
                  Cancel
                </Button>
              )}
            </div>
            <div className={formClasses.footerChecks}>
              <Checkbox
                label="Start search for missing movie"
                checked={searchForMovie}
                onChange={(e) => setSearchForMovie(e.currentTarget.checked)}
              />
            </div>
            <Button
              loading={addMutation.isPending}
              disabled={!canAdd}
              onClick={() => {
                if (!selectedProfileId || !selectedRootPath) return;
                addMutation.mutate({
                  tmdbId: movie.tmdbId,
                  qualityProfileId: Number(selectedProfileId),
                  rootFolderPath: selectedRootPath,
                  path: joinedPath,
                  monitored,
                  minimumAvailability,
                  tagIds: tagIds.map(Number),
                  searchForMovie,
                });
              }}
            >
              Add {movie.title}
            </Button>
          </div>
        </>
      )}

      {!loading && !optionsQuery.data && (
        <div className={formClasses.footer}>
          <div className={formClasses.footerStart}>
            {onBack ? (
              <Button variant="default" leftSection={<ArrowLeftIcon size={16} />} onClick={onBack}>
                Back
              </Button>
            ) : null}
          </div>
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
        </div>
      )}
    </Stack>
  );
}
