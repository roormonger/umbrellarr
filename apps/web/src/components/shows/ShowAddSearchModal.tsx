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
  SERIES_ADD_MONITOR_OPTIONS,
  SERIES_TYPE_OPTIONS,
  type SeriesAddMonitor,
  type SeriesAddRequest,
  type SeriesLookupItem,
  type SeriesType,
} from "@umbrellarr/shared";
import { useMemo, useState } from "react";
import { addSeries, getSeriesEditOptions, lookupSeries } from "@/api/shows";
import formClasses from "@/components/media/ArrAddForm.module.css";
import { joinMoviePath, rootFolderLabel } from "@/lib/moviePath";
import classes from "./ShowAddSearchModal.module.css";

type Props = {
  opened: boolean;
  instanceId: string;
  onClose: () => void;
};

function suggestedFolder(series: SeriesLookupItem): string {
  if (series.folder) {
    return series.folder.startsWith("/") ? series.folder : `/${series.folder}`;
  }
  const year = series.year ? ` (${series.year})` : "";
  return `/${series.title}${year}`;
}

function folderLabel(series: SeriesLookupItem): string {
  return suggestedFolder(series).replace(/^\/+/, "");
}

function formatLookupRating(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function ratingLine(series: SeriesLookupItem): string | undefined {
  const parts: string[] = [];
  if (series.tmdbRating != null) parts.push(`TMDb ${formatLookupRating(series.tmdbRating)}`);
  if (series.imdbRating != null) parts.push(`IMDb ${formatLookupRating(series.imdbRating)}`);
  if (series.traktRating != null) {
    parts.push(`Trakt ${formatLookupRating(series.traktRating)}%`);
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function seriesTitle(series: SeriesLookupItem): string {
  return series.year ? `${series.title} (${series.year})` : series.title;
}

export function ShowAddSearchModal({ opened, instanceId, onClose }: Props) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [debouncedTerm] = useDebouncedValue(term, 300);
  const [selected, setSelected] = useState<SeriesLookupItem | null>(null);

  const lookupTerm = debouncedTerm.trim();
  const lookupQuery = useQuery({
    queryKey: ["series-lookup", instanceId, lookupTerm],
    queryFn: () => lookupSeries(instanceId, lookupTerm),
    enabled: opened && !selected && lookupTerm.length > 0,
    placeholderData: keepPreviousData,
  });

  function handleClose() {
    setTerm("");
    setSelected(null);
    onClose();
  }

  function handlePick(series: SeriesLookupItem) {
    if (series.inLibrary && series.externalId != null) {
      handleClose();
      void navigate({
        to: "/shows/$instanceId/$seriesId",
        params: { instanceId, seriesId: String(series.externalId) },
      });
      return;
    }
    setSelected(series);
  }

  const results = lookupQuery.data?.results ?? [];
  const adding = selected != null && !selected.inLibrary;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={adding && selected ? seriesTitle(selected) : "Add New Series"}
      size="xl"
      centered
    >
      {adding && selected ? (
        <ShowAddForm
          instanceId={instanceId}
          series={selected}
          onBack={() => setSelected(null)}
          onClose={handleClose}
        />
      ) : (
        <Stack gap="md">
          <TextInput
            placeholder="Search series…"
            leftSection={<MagnifyingGlassIcon />}
            value={term}
            onChange={(e) => setTerm(e.currentTarget.value)}
            autoFocus
          />

          {!lookupTerm && (
            <Text c="dimmed" size="sm">
              Type a title to search Sonarr.
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

          {lookupTerm &&
            lookupQuery.isSuccess &&
            !lookupQuery.isFetching &&
            results.length === 0 && (
              <Text c="dimmed" size="sm">
                No matches.
              </Text>
            )}

          {lookupTerm && results.length > 0 && (
            <div className={classes.results}>
              {results.map((series) => (
                <LookupResultRow
                  key={series.tvdbId}
                  series={series}
                  onPick={() => handlePick(series)}
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
  series,
  onPick,
}: {
  series: SeriesLookupItem;
  onPick: () => void;
}) {
  const ratings = ratingLine(series);
  const genres = series.genres.length > 0 ? series.genres.slice(0, 4).join(", ") : undefined;

  return (
    <UnstyledButton className={classes.row} onClick={onPick} data-tvdb-id={series.tvdbId}>
      {series.posterUrl ? (
        <img className={classes.poster} src={series.posterUrl} alt="" />
      ) : (
        <div className={classes.poster} />
      )}
      <div className={classes.meta}>
        <div className={classes.titleRow}>
          <Text fw={600} lineClamp={1}>
            {series.title}
          </Text>
          {series.year != null && <span className={classes.year}>{series.year}</span>}
          {series.inLibrary && (
            <Badge size="xs" variant="light" color="teal">
              In Library
            </Badge>
          )}
        </div>
        {series.network && <div className={classes.genres}>{series.network}</div>}
        {ratings && <div className={classes.ratings}>{ratings}</div>}
        {genres && <div className={classes.genres}>{genres}</div>}
        {series.overview && (
          <Text className={classes.overview} c="dimmed" lineClamp={2}>
            {series.overview}
          </Text>
        )}
      </div>
    </UnstyledButton>
  );
}

function ShowAddForm({
  instanceId,
  series,
  onBack,
  onClose,
}: {
  instanceId: string;
  series: SeriesLookupItem;
  onBack: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const optionsQuery = useQuery({
    queryKey: ["series-options", instanceId],
    queryFn: () => getSeriesEditOptions(instanceId),
    staleTime: 5 * 60_000,
  });

  const [monitor, setMonitor] = useState<SeriesAddMonitor>("all");
  const [seriesType, setSeriesType] = useState<SeriesType>(series.seriesType ?? "standard");
  const [seasonFolder, setSeasonFolder] = useState(true);
  const [qualityProfileId, setQualityProfileId] = useState<string | null>(null);
  const [rootFolderPath, setRootFolderPath] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [searchForMissingEpisodes, setSearchForMissingEpisodes] = useState(true);
  const [searchForCutoffUnmetEpisodes, setSearchForCutoffUnmetEpisodes] = useState(false);
  const folder = folderLabel(series);

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
    mutationFn: (body: SeriesAddRequest) => addSeries(instanceId, body),
    onSuccess: async (detail) => {
      notifications.show({
        color: "green",
        message: `Added “${detail.title}” to Sonarr`,
      });
      await queryClient.invalidateQueries({ queryKey: ["shows"] });
      onClose();
      void navigate({
        to: "/shows/$instanceId/$seriesId",
        params: { instanceId, seriesId: String(detail.externalId) },
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
  const seriesTypeOption = SERIES_TYPE_OPTIONS.find((o) => o.value === seriesType);

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
            {series.posterUrl ? (
              <img className={formClasses.poster} src={series.posterUrl} alt="" />
            ) : (
              <div className={formClasses.poster} />
            )}
            <div className={formClasses.main}>
              {series.overview && (
                <Text className={formClasses.overview} lineClamp={6}>
                  {series.overview}
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
                    <Select
                      aria-label="Monitor"
                      data={SERIES_ADD_MONITOR_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                      value={monitor}
                      onChange={(value) => {
                        if (value) setMonitor(value as SeriesAddMonitor);
                      }}
                      allowDeselect={false}
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
                  <div className={formClasses.label}>Series Type</div>
                  <div className={formClasses.control}>
                    <Select
                      aria-label="Series Type"
                      data={SERIES_TYPE_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.label,
                        description: o.description,
                      }))}
                      value={seriesType}
                      onChange={(value) => {
                        if (value) setSeriesType(value as SeriesType);
                      }}
                      allowDeselect={false}
                      renderOption={({ option }) => (
                        <Stack gap={0}>
                          <Text size="sm">{option.label}</Text>
                          {"description" in option && option.description ? (
                            <Text size="xs" c="dimmed">
                              {String(option.description)}
                            </Text>
                          ) : null}
                        </Stack>
                      )}
                    />
                    {seriesTypeOption && (
                      <div className={formClasses.hint}>
                        Series type is used for renaming, parsing and searching
                      </div>
                    )}
                  </div>
                </div>

                <div className={formClasses.row}>
                  <div className={formClasses.label}>Season Folder</div>
                  <div className={formClasses.control}>
                    <Checkbox
                      aria-label="Season Folder"
                      checked={seasonFolder}
                      onChange={(e) => setSeasonFolder(e.currentTarget.checked)}
                      mt={6}
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
              <Button
                variant="default"
                leftSection={<ArrowLeftIcon size={16} />}
                onClick={onBack}
                disabled={addMutation.isPending}
              >
                Back
              </Button>
            </div>
            <div className={formClasses.footerChecks}>
              <Checkbox
                label="Start search for missing episodes"
                checked={searchForMissingEpisodes}
                onChange={(e) => setSearchForMissingEpisodes(e.currentTarget.checked)}
              />
              <Checkbox
                label="Start search for cutoff unmet episodes"
                checked={searchForCutoffUnmetEpisodes}
                onChange={(e) => setSearchForCutoffUnmetEpisodes(e.currentTarget.checked)}
              />
            </div>
            <Button
              loading={addMutation.isPending}
              disabled={!canAdd}
              onClick={() => {
                if (!selectedProfileId || !selectedRootPath) return;
                addMutation.mutate({
                  tvdbId: series.tvdbId,
                  qualityProfileId: Number(selectedProfileId),
                  rootFolderPath: selectedRootPath,
                  path: joinedPath,
                  monitor,
                  monitorNewItems: "all",
                  seriesType,
                  seasonFolder,
                  tagIds: tagIds.map(Number),
                  searchForMissingEpisodes,
                  searchForCutoffUnmetEpisodes,
                });
              }}
            >
              Add {series.title}
            </Button>
          </div>
        </>
      )}

      {!loading && !optionsQuery.data && (
        <div className={formClasses.footer}>
          <div className={formClasses.footerStart}>
            <Button variant="default" leftSection={<ArrowLeftIcon size={16} />} onClick={onBack}>
              Back
            </Button>
          </div>
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
        </div>
      )}
    </Stack>
  );
}
