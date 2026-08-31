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
import type { ArtistRetagPreview } from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import { getArtistRetagPreview, retagArtistFiles } from "@/api/artists";
import { formatFreeSpace } from "@/lib/moviePath";
import classes from "../movies/MovieOrganizeModal.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  instanceId: string;
  artistId: number;
};

function formatRetagValue(field: string, value: string | undefined): string {
  if (value == null || value === "" || value === "0") return "";
  if (field === "Image Size") {
    const bytes = Number(value);
    if (!Number.isFinite(bytes)) return value;
    return formatFreeSpace(bytes);
  }
  return value;
}

function RetagRow({
  item,
  checked,
  onChange,
}: {
  item: ArtistRetagPreview;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={classes.row}>
      <Checkbox
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        aria-label={`Retag ${item.path}`}
        mt={2}
      />
      <div className={classes.paths}>
        <Text size="sm" style={{ wordBreak: "break-all" }}>
          {item.path}
        </Text>
        {item.changes.map((change) => {
          const oldValue = formatRetagValue(change.field, change.oldValue);
          const newValue = formatRetagValue(change.field, change.newValue);
          return (
            <Text
              key={`${item.trackFileId}-${change.field}`}
              size="xs"
              c="dimmed"
              style={{ wordBreak: "break-all" }}
            >
              <Text span fw={500} c="var(--mantine-color-text)">
                {change.field}
              </Text>{" "}
              <Text span className={classes.existing}>
                {oldValue || "—"}
              </Text>
              {" → "}
              <Text span className={classes.newPath}>
                {newValue || "—"}
              </Text>
            </Text>
          );
        })}
      </div>
    </div>
  );
}

export function ArtistRetagModal({
  opened,
  onClose,
  instanceId,
  artistId,
}: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const previewQuery = useQuery({
    queryKey: ["artist-retag", instanceId, artistId],
    queryFn: () => getArtistRetagPreview(instanceId, artistId),
    enabled: opened,
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

  const retagMutation = useMutation({
    mutationFn: () => retagArtistFiles(instanceId, artistId, { files: selectedIds }),
    onSuccess: async () => {
      notifications.show({
        color: "blue",
        message: "Write Metadata Tags queued in Lidarr",
      });
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["artist-retag", instanceId, artistId] });
      await queryClient.invalidateQueries({ queryKey: ["artist", instanceId, artistId] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Retag failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Write Metadata Tags" size="lg" centered>
      {previewQuery.isLoading && (
        <Group justify="center" py="xl">
          <Loader size="xl" />
        </Group>
      )}

      {previewQuery.error && (
        <Text c="red" size="sm">
          {previewQuery.error instanceof Error
            ? previewQuery.error.message
            : "Error loading previews"}
        </Text>
      )}

      {!previewQuery.isLoading && !previewQuery.error && items.length > 0 && (
        <Stack gap="md">
          <Alert color="violet" variant="light" className={classes.banner}>
            <Text size="sm">
              MusicBrainz identifiers will also be added to the files; these are not shown below.
            </Text>
          </Alert>

          <ScrollArea.Autosize mah="50vh" type="auto" offsetScrollbars>
            {items.map((item) => (
              <RetagRow
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

      {!previewQuery.isLoading && !previewQuery.error && items.length === 0 && (
        <Text size="sm" py="md">
          Success! My work is done, no files to retag.
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
            loading={retagMutation.isPending}
            disabled={items.length === 0 || noneSelected}
            onClick={() => retagMutation.mutate()}
          >
            Retag
          </Button>
        </Group>
      </Group>
    </Modal>
  );
}
