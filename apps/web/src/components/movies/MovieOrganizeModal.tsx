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
import type { MovieRenamePreview } from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import {
  getMovieNamingConfig,
  getMovieRenamePreview,
  organizeMovieFiles,
} from "@/api/movies";
import classes from "./MovieOrganizeModal.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  instanceId: string;
  movieId: number;
  moviePath: string;
};

function RenameRow({
  item,
  checked,
  onChange,
}: {
  item: MovieRenamePreview;
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

export function MovieOrganizeModal({
  opened,
  onClose,
  instanceId,
  movieId,
  moviePath,
}: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const previewQuery = useQuery({
    queryKey: ["movie-rename", instanceId, movieId],
    queryFn: () => getMovieRenamePreview(instanceId, movieId),
    enabled: opened,
  });

  const namingQuery = useQuery({
    queryKey: ["movie-naming", instanceId],
    queryFn: () => getMovieNamingConfig(instanceId),
    enabled: opened,
    staleTime: 60_000,
  });

  const items = previewQuery.data?.items ?? [];

  useEffect(() => {
    if (!opened || !previewQuery.data) return;
    const next: Record<number, boolean> = {};
    for (const item of previewQuery.data.items) {
      next[item.movieFileId] = true;
    }
    setSelected(next);
  }, [opened, previewQuery.data]);

  const selectedIds = useMemo(
    () =>
      items.filter((item) => selected[item.movieFileId]).map((item) => item.movieFileId),
    [items, selected],
  );

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const noneSelected = selectedIds.length === 0;

  const organizeMutation = useMutation({
    mutationFn: () => organizeMovieFiles(instanceId, movieId, selectedIds),
    onSuccess: async () => {
      notifications.show({
        color: "blue",
        message: "Organize & Rename queued in Radarr",
      });
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["movie", instanceId, movieId] });
      await queryClient.invalidateQueries({ queryKey: ["movie-rename", instanceId, movieId] });
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
  const renameEnabled = namingQuery.data?.renameMovies ?? true;
  const pattern = namingQuery.data?.standardMovieFormat ?? "";

  return (
    <Modal opened={opened} onClose={onClose} title="Organize & Rename" size="lg" centered>
      {loading && (
        <Group justify="center" py="xl">
          <Loader size="xl" />
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
              All paths are relative to: <code>{moviePath}</code>
            </Text>
            <Text size="sm" mt={4}>
              Naming pattern: <code>{pattern}</code>
            </Text>
          </Alert>

          <ScrollArea.Autosize mah="50vh" type="auto" offsetScrollbars>
            {items.map((item) => (
              <RenameRow
                key={item.movieFileId}
                item={item}
                checked={Boolean(selected[item.movieFileId])}
                onChange={(checked) =>
                  setSelected((prev) => ({ ...prev, [item.movieFileId]: checked }))
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
                next[item.movieFileId] = checked;
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
