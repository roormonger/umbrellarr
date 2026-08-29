import {
  Button,
  CheckIcon,
  Checkbox,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SERIES_MONITOR_NEW_ITEMS_OPTIONS,
  SERIES_TYPE_OPTIONS,
  type SeriesDetail,
  type SeriesMonitorNewItems,
  type SeriesType,
  type SeriesUpdateRequest,
} from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import {
  deleteSeries,
  getSeriesDetail,
  getSeriesEditOptions,
  updateSeries,
} from "@/api/shows";
import { joinMoviePath, rootFolderLabel, splitMoviePath } from "@/lib/moviePath";

type Props = {
  opened: boolean;
  instanceId: string;
  seriesId: number;
  title: string;
  onClose: () => void;
};

export function ShowEditModal({ opened, instanceId, seriesId, title, onClose }: Props) {
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: ["series", instanceId, seriesId],
    queryFn: () => getSeriesDetail(instanceId, seriesId),
    enabled: opened,
  });
  const optionsQuery = useQuery({
    queryKey: ["series-options", instanceId],
    queryFn: () => getSeriesEditOptions(instanceId),
    enabled: opened,
    staleTime: 5 * 60_000,
  });

  const [monitored, setMonitored] = useState(false);
  const [monitorNewItems, setMonitorNewItems] = useState<SeriesMonitorNewItems>("all");
  const [seriesType, setSeriesType] = useState<SeriesType>("standard");
  const [seasonFolder, setSeasonFolder] = useState(true);
  const [qualityProfileId, setQualityProfileId] = useState<string | null>(null);
  const [rootFolderPath, setRootFolderPath] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);

  useEffect(() => {
    const detail = detailQuery.data;
    const roots = optionsQuery.data?.rootFolders;
    if (!detail || !roots) return;

    setMonitored(detail.monitored);
    setMonitorNewItems(detail.monitorNewItems);
    setSeriesType(detail.seriesType);
    setSeasonFolder(detail.seasonFolder);
    setQualityProfileId(String(detail.qualityProfileId));
    setTagIds(detail.tagIds.map(String));

    const split = splitMoviePath(detail.path, roots);
    setRootFolderPath(split.rootFolderPath);
    setFolderName(split.folderName);
  }, [detailQuery.data, optionsQuery.data?.rootFolders]);

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
      (optionsQuery.data?.rootFolders ?? []).map((r) => ({
        value: r.path.replace(/\/+$/, "") || "/",
        label: rootFolderLabel(r.path.replace(/\/+$/, "") || "/", r.freeSpace),
      })),
    [optionsQuery.data?.rootFolders],
  );

  const saveMutation = useMutation({
    mutationFn: (body: SeriesUpdateRequest) => updateSeries(instanceId, seriesId, body),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Show saved" });
      await queryClient.invalidateQueries({ queryKey: ["shows"] });
      await queryClient.invalidateQueries({ queryKey: ["series", instanceId, seriesId] });
      onClose();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Save failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSeries(instanceId, seriesId, false),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Show removed from Sonarr" });
      await queryClient.invalidateQueries({ queryKey: ["shows"] });
      onClose();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Delete failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const busy = saveMutation.isPending || deleteMutation.isPending;
  const loading = detailQuery.isLoading || optionsQuery.isLoading;
  const detail: SeriesDetail | undefined = detailQuery.data;
  const joinedPath =
    rootFolderPath && folderName.trim() ? joinMoviePath(rootFolderPath, folderName) : "";
  const canSave = Boolean(qualityProfileId && rootFolderPath && folderName.trim());

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Edit - ${detail?.year ? `${detail.title} (${detail.year})` : title}`}
      size="lg"
      centered
    >
      {loading && (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      )}

      {detailQuery.error && (
        <Text c="red">
          {detailQuery.error instanceof Error ? detailQuery.error.message : "Failed to load show"}
        </Text>
      )}

      {!loading && detail && (
        <Stack gap="md">
          <Checkbox
            label="Monitored"
            description="Monitor this series for new episodes"
            checked={monitored}
            onChange={(e) => setMonitored(e.currentTarget.checked)}
          />

          <Select
            label="Monitor New Items"
            data={SERIES_MONITOR_NEW_ITEMS_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            value={monitorNewItems}
            onChange={(value) => {
              if (value) setMonitorNewItems(value as SeriesMonitorNewItems);
            }}
            allowDeselect={false}
          />

          <Select
            label="Series Type"
            data={SERIES_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={seriesType}
            onChange={(value) => {
              if (value) setSeriesType(value as SeriesType);
            }}
            allowDeselect={false}
          />

          <Checkbox
            label="Season Folder"
            checked={seasonFolder}
            onChange={(e) => setSeasonFolder(e.currentTarget.checked)}
          />

          <Select
            label="Quality Profile"
            data={profileOptions}
            value={qualityProfileId}
            onChange={setQualityProfileId}
            allowDeselect={false}
            searchable
          />

          <Stack gap={6}>
            <Text size="sm" fw={500}>
              Path
            </Text>
            <Group align="flex-start" grow preventGrowOverflow={false} wrap="nowrap">
              <Select
                aria-label="Root folder"
                data={rootOptions}
                value={rootFolderPath}
                onChange={setRootFolderPath}
                allowDeselect={false}
                searchable={false}
                withCheckIcon={false}
                placeholder="Root folder"
                style={{ flex: "1 1 55%", minWidth: 0 }}
                styles={{
                  input: { cursor: "pointer" },
                }}
                renderOption={({ option, checked }) => (
                  <Group gap="xs" wrap="nowrap">
                    {checked ? (
                      <CheckIcon
                        width={12}
                        height={12}
                        style={{ color: "var(--mantine-color-violet-6)" }}
                      />
                    ) : (
                      <span style={{ width: 12, height: 12, flexShrink: 0 }} />
                    )}
                    <span>{option.label}</span>
                  </Group>
                )}
              />
              <TextInput
                aria-label="Series folder"
                value={folderName}
                onChange={(e) => setFolderName(e.currentTarget.value)}
                placeholder="/Series Title (Year)"
                style={{ flex: "1 1 45%", minWidth: 0 }}
              />
            </Group>
            {!rootFolderPath && detail.path && (
              <Text size="xs" c="dimmed">
                Current path is not under a configured root folder. Choose a root to continue.
              </Text>
            )}
          </Stack>

          <MultiSelect
            label="Tags"
            data={tagOptions}
            value={tagIds}
            onChange={setTagIds}
            searchable
            clearable
          />

          <Group justify="space-between" mt="md">
            <Button
              color="red"
              variant="filled"
              loading={deleteMutation.isPending}
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Remove "${detail.title}" from Sonarr? Episode files on disk will be kept.`,
                  )
                ) {
                  deleteMutation.mutate();
                }
              }}
            >
              Delete
            </Button>
            <Group>
              <Button variant="default" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                loading={saveMutation.isPending}
                disabled={busy || !canSave}
                onClick={() => {
                  if (!qualityProfileId || !rootFolderPath) return;
                  saveMutation.mutate({
                    monitored,
                    monitorNewItems,
                    seriesType,
                    seasonFolder,
                    qualityProfileId: Number(qualityProfileId),
                    path: joinedPath,
                    tagIds: tagIds.map(Number),
                  });
                }}
              >
                Save
              </Button>
            </Group>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
