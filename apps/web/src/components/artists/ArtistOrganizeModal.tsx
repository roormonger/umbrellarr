import {
  Alert,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MinusIcon } from "@phosphor-icons/react/dist/csr/Minus";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import type { ArtistRenamePreview } from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import {
  getArtistNamingConfig,
  getArtistRenamePreview,
  organizeArtistFiles,
} from "@/api/artists";
import classes from "../movies/MovieOrganizeModal.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  instanceId: string;
  artistId: number;
};

function RenameRow({
  item,
  checked,
  onChange,
}: {
  item: ArtistRenamePreview;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={classes.row}>
      <Checkbox
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        aria-label={`Rename ${item.existingPath}`}
        mt={2}
      />
      <div className={classes.paths}>
        <div className={`${classes.pathLine} ${classes.existing}`}>
          <span className={classes.marker} aria-hidden>
            <MinusIcon size={14} weight="bold" />
          </span>
          <span>{item.existingPath}</span>
        </div>
        <div className={`${classes.pathLine} ${classes.newPath}`}>
          <span className={classes.marker} aria-hidden>
            <PlusIcon size={14} weight="bold" />
          </span>
          <span>{item.newPath}</span>
        </div>
      </div>
    </div>
  );
}

export function ArtistOrganizeModal({
  opened,
  onClose,
  instanceId,
  artistId,
}: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const previewQuery = useQuery({
    queryKey: ["artist-rename", instanceId, artistId],
    queryFn: () => getArtistRenamePreview(instanceId, artistId),
    enabled: opened,
  });

  const namingQuery = useQuery({
    queryKey: ["artist-naming", instanceId],
    queryFn: () => getArtistNamingConfig(instanceId),
    enabled: opened,
    staleTime: 60_000,
  });

  const items = previewQuery.data?.items ?? [];

  useEffect(() => {
    if (!opened || !previewQuery.data) return;
    const next: Record<number, boolean> = {};
    for (const item of previewQuery.data.items) {
      next[item.trackFileId] = true;
    }
    setSelected(next);
  }, [opened, previewQuery.data]);

  const selectedIds = useMemo(
    () => items.filter((item) => selected[item.trackFileId]).map((item) => item.trackFileId),
    [items, selected],
  );

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const noneSelected = selectedIds.length === 0;

  const organizeMutation = useMutation({
    mutationFn: () => organizeArtistFiles(instanceId, artistId, { files: selectedIds }),
    onSuccess: async () => {
      notifications.show({
        color: "blue",
        message: "Organize & Rename queued in Lidarr",
      });
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["artist", instanceId, artistId] });
      await queryClient.invalidateQueries({ queryKey: ["artist-rename", instanceId, artistId] });
      await queryClient.invalidateQueries({ queryKey: ["artist-albums", instanceId, artistId] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Organize failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const loading = previewQuery.isLoading || namingQuery.isLoading;
  const error = previewQuery.error ?? namingQuery.error;
  const renameEnabled = namingQuery.data?.renameTracks ?? true;
  const pattern =
    namingQuery.data?.standardTrackFormat ||
    namingQuery.data?.multiDiscTrackFormat ||
    "";

  return (
    <Modal opened={opened} onClose={onClose} title="Organize & Rename" size="lg" centered>
      {loading && (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      )}

      {error && (
        <Text c="red" size="sm">
          {error instanceof Error ? error.message : "Error loading previews"}
        </Text>
      )}

      {!loading && !error && items.length > 0 && (
        <Stack gap="md">
          <Alert color="violet" variant="light" className={classes.banner}>
            <Text size="sm">
              Naming pattern: <code>{pattern}</code>
            </Text>
          </Alert>

          <ScrollArea.Autosize mah="50vh" type="auto" offsetScrollbars>
            {items.map((item) => (
              <RenameRow
                key={item.trackFileId}
                item={item}
                checked={Boolean(selected[item.trackFileId])}
                onChange={(checked) =>
                  setSelected((prev) => ({ ...prev, [item.trackFileId]: checked }))
                }
              />
            ))}
          </ScrollArea.Autosize>
        </Stack>
      )}

      {!loading && !error && items.length === 0 && (
        <Text size="sm" py="md">
          {renameEnabled
            ? "Success! My work is done, no files to rename."
            : "Renaming is disabled, nothing to rename"}
        </Text>
      )}

      <Group justify="space-between" mt="lg">
        {items.length > 0 ? (
          <Checkbox
            label="Select all"
            checked={allSelected}
            indeterminate={!allSelected && !noneSelected}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              const next: Record<number, boolean> = {};
              for (const item of items) {
                next[item.trackFileId] = checked;
              }
              setSelected(next);
            }}
          />
        ) : (
          <span />
        )}
        <Group gap="sm">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={organizeMutation.isPending}
            disabled={items.length === 0 || noneSelected}
            onClick={() => organizeMutation.mutate()}
          >
            Organize
          </Button>
        </Group>
      </Group>
    </Modal>
  );
}
