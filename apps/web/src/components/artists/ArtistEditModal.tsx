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
  ARTIST_MONITOR_NEW_ITEMS_OPTIONS,
  type ArtistDetail,
  type ArtistMonitorNewItems,
  type ArtistUpdateRequest,
} from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import {
  deleteArtist,
  getArtistDetail,
  getArtistEditOptions,
  updateArtist,
} from "@/api/artists";
import { joinMoviePath, rootFolderLabel, splitMoviePath } from "@/lib/moviePath";

type Props = {
  opened: boolean;
  instanceId: string;
  artistId: number;
  title: string;
  onClose: () => void;
  onDeleted?: () => void;
};

export function ArtistEditModal({
  opened,
  instanceId,
  artistId,
  title,
  onClose,
  onDeleted,
}: Props) {
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: ["artist", instanceId, artistId],
    queryFn: () => getArtistDetail(instanceId, artistId),
    enabled: opened,
  });
  const optionsQuery = useQuery({
    queryKey: ["artist-options", instanceId],
    queryFn: () => getArtistEditOptions(instanceId),
    enabled: opened,
    staleTime: 5 * 60_000,
  });

  const [monitored, setMonitored] = useState(false);
  const [monitorNewItems, setMonitorNewItems] = useState<ArtistMonitorNewItems>("all");
  const [qualityProfileId, setQualityProfileId] = useState<string | null>(null);
  const [metadataProfileId, setMetadataProfileId] = useState<string | null>(null);
  const [rootFolderPath, setRootFolderPath] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);

  useEffect(() => {
    const detail = detailQuery.data;
    const roots = optionsQuery.data?.rootFolders;
    if (!detail || !roots) return;

    setMonitored(detail.monitored);
    setMonitorNewItems(detail.monitorNewItems);
    setQualityProfileId(String(detail.qualityProfileId));
    setMetadataProfileId(String(detail.metadataProfileId));
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

  const metadataOptions = useMemo(
    () =>
      (optionsQuery.data?.metadataProfiles ?? []).map((p) => ({
        value: String(p.id),
        label: p.name,
      })),
    [optionsQuery.data?.metadataProfiles],
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
    mutationFn: (body: ArtistUpdateRequest) => updateArtist(instanceId, artistId, body),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Artist saved" });
      await queryClient.invalidateQueries({ queryKey: ["artists"] });
      await queryClient.invalidateQueries({ queryKey: ["artist", instanceId, artistId] });
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
    mutationFn: () => deleteArtist(instanceId, artistId, false),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Artist removed from Lidarr" });
      await queryClient.invalidateQueries({ queryKey: ["artists"] });
      onClose();
      onDeleted?.();
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
  const detail: ArtistDetail | undefined = detailQuery.data;
  const joinedPath =
    rootFolderPath && folderName.trim() ? joinMoviePath(rootFolderPath, folderName) : "";
  const canSave = Boolean(
    qualityProfileId && metadataProfileId && rootFolderPath && folderName.trim(),
  );

  return (
    <Modal opened={opened} onClose={onClose} title={`Edit - ${title}`} size="lg" centered>
      {loading && (
        <Group justify="center" py="xl">
          <Loader size="xl" />
        </Group>
      )}

      {detailQuery.error && (
        <Text c="red">
          {detailQuery.error instanceof Error ? detailQuery.error.message : "Failed to load artist"}
        </Text>
      )}

      {!loading && detail && (
        <Stack gap="md">
          <Checkbox
            label="Monitored"
            description="Download monitored albums from this artist"
            checked={monitored}
            onChange={(e) => setMonitored(e.currentTarget.checked)}
          />

          <Select
            label="Monitor New Albums"
            description="Which new albums should be monitored"
            data={ARTIST_MONITOR_NEW_ITEMS_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            value={monitorNewItems}
            onChange={(value) => {
              if (value) setMonitorNewItems(value as ArtistMonitorNewItems);
            }}
            allowDeselect={false}
          />

          <Select
            label="Quality Profile"
            data={profileOptions}
            value={qualityProfileId}
            onChange={setQualityProfileId}
            allowDeselect={false}
            searchable
          />

          <Select
            label="Metadata Profile"
            description="Metadata Profile list items should be added with"
            data={metadataOptions}
            value={metadataProfileId}
            onChange={setMetadataProfileId}
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
                aria-label="Artist folder"
                value={folderName}
                onChange={(e) => setFolderName(e.currentTarget.value)}
                placeholder="/Artist Name"
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
                    `Remove "${detail.title}" from Lidarr? Track files on disk will be kept.`,
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
                  if (!qualityProfileId || !metadataProfileId || !rootFolderPath) return;
                  saveMutation.mutate({
                    monitored,
                    monitorNewItems,
                    qualityProfileId: Number(qualityProfileId),
                    metadataProfileId: Number(metadataProfileId),
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
