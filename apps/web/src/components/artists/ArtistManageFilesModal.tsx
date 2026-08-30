import {
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Select,
  Table,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArtistManageFile, ArtistQualityOption, ArtistReleaseQuality } from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import {
  bulkDeleteArtistFiles,
  bulkUpdateArtistFiles,
  getArtistManageFiles,
  getArtistQualities,
} from "@/api/artists";
import classes from "../movies/MovieManageFilesModal.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  instanceId: string;
  artistId: number;
};

function buildQuality(
  qualityId: number,
  qualities: ArtistQualityOption[],
): ArtistReleaseQuality | null {
  const option = qualities.find((q) => q.id === qualityId);
  if (!option) return null;
  return {
    quality: { id: option.id, name: option.name },
    revision: {
      version: 1,
      real: 0,
      isRepack: false,
    },
  };
}

export function ArtistManageFilesModal({
  opened,
  onClose,
  instanceId,
  artistId,
}: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [qualitySelect, setQualitySelect] = useState<string | null>(null);

  const filesQuery = useQuery({
    queryKey: ["artist-manage-files", instanceId, artistId],
    queryFn: () => getArtistManageFiles(instanceId, artistId),
    enabled: opened,
  });

  const qualitiesQuery = useQuery({
    queryKey: ["artist-qualities", instanceId],
    queryFn: () => getArtistQualities(instanceId),
    enabled: opened,
    staleTime: 5 * 60_000,
  });

  const loading = filesQuery.isLoading || qualitiesQuery.isLoading;
  const error = filesQuery.error ?? qualitiesQuery.error;
  const files = filesQuery.data?.files ?? [];
  const qualities = qualitiesQuery.data?.qualities ?? [];

  useEffect(() => {
    if (!opened) return;
    setSelected({});
    setQualitySelect(null);
  }, [opened, filesQuery.data]);

  const selectedTrackFileIds = useMemo(() => {
    const ids: number[] = [];
    for (const file of files) {
      if (!selected[file.id]) continue;
      if (!ids.includes(file.trackFileId)) ids.push(file.trackFileId);
    }
    return ids;
  }, [files, selected]);

  const allSelected = files.length > 0 && files.every((file) => selected[file.id]);
  const noneSelected = selectedTrackFileIds.length === 0;

  const qualityOptions = useMemo(
    () => qualities.map((q) => ({ value: String(q.id), label: q.name })),
    [qualities],
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["artist", instanceId, artistId] });
    await queryClient.invalidateQueries({
      queryKey: ["artist-manage-files", instanceId, artistId],
    });
    await queryClient.invalidateQueries({ queryKey: ["artist-albums", instanceId, artistId] });
    await queryClient.invalidateQueries({ queryKey: ["artists"] });
  };

  const qualityMutation = useMutation({
    mutationFn: (qualityId: number) => {
      const quality = buildQuality(qualityId, qualities);
      if (!quality) throw new Error("Unknown quality");
      return bulkUpdateArtistFiles(instanceId, {
        trackFileIds: selectedTrackFileIds,
        quality,
      });
    },
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Track quality updated in Lidarr" });
      setQualitySelect(null);
      await invalidate();
    },
    onError: (err) => {
      setQualitySelect(null);
      notifications.show({
        color: "red",
        title: "Quality update failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      bulkDeleteArtistFiles(instanceId, { trackFileIds: selectedTrackFileIds }),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Track files deleted in Lidarr" });
      onClose();
      await invalidate();
    },
    onError: (err) => {
      notifications.show({
        color: "red",
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const busy = qualityMutation.isPending || deleteMutation.isPending;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Manage Tracks"
      size="95%"
      centered
      styles={{ content: { maxWidth: 1100 } }}
    >
      {loading && (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      )}

      {error && (
        <Text c="red" size="sm">
          {error instanceof Error ? error.message : "Failed to load files"}
        </Text>
      )}

      {!loading && !error && files.length === 0 && (
        <Text c="dimmed" size="sm" ta="center" py="xl">
          No track files to manage.
        </Text>
      )}

      {!loading && !error && files.length > 0 && (
        <div className={classes.tableWrap}>
          <ScrollArea.Autosize mah="50vh" type="auto" offsetScrollbars>
            <Table striped highlightOnHover horizontalSpacing="sm" verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={40}>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={!allSelected && !noneSelected}
                      aria-label="Select all tracks"
                      onChange={(e) => {
                        const checked = e.currentTarget.checked;
                        const next: Record<number, boolean> = {};
                        for (const file of files) next[file.id] = checked;
                        setSelected(next);
                      }}
                    />
                  </Table.Th>
                  <Table.Th w={64}>Track</Table.Th>
                  <Table.Th>Path</Table.Th>
                  <Table.Th w={120}>Quality</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {files.map((file: ArtistManageFile) => (
                  <Table.Tr key={file.id}>
                    <Table.Td>
                      <Checkbox
                        checked={Boolean(selected[file.id])}
                        aria-label={`Select track ${file.trackNumber} ${file.relativePath}`}
                        onChange={(e) =>
                          setSelected((prev) => ({
                            ...prev,
                            [file.id]: e.currentTarget.checked,
                          }))
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace">
                        {file.trackNumber || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" className={classes.path}>
                        {file.relativePath}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {file.quality ? (
                        <Badge size="sm" variant="light" color="gray">
                          {file.quality}
                        </Badge>
                      ) : (
                        <Text size="sm">—</Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        </div>
      )}

      <Group justify="space-between" mt="lg" wrap="wrap">
        <Group gap="sm">
          <Button
            color="red"
            disabled={noneSelected || busy}
            loading={deleteMutation.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to delete ${selectedTrackFileIds.length} selected track file${selectedTrackFileIds.length === 1 ? "" : "s"}?`,
                )
              ) {
                deleteMutation.mutate();
              }
            }}
          >
            Delete
          </Button>
          <Select
            placeholder="Select Quality"
            data={qualityOptions}
            value={qualitySelect}
            disabled={noneSelected || busy || files.length === 0}
            onChange={(value) => {
              if (!value) return;
              setQualitySelect(value);
              qualityMutation.mutate(Number(value));
            }}
            w={180}
            clearable={false}
          />
        </Group>
        <Button variant="default" onClick={onClose} disabled={busy}>
          Close
        </Button>
      </Group>
    </Modal>
  );
}
