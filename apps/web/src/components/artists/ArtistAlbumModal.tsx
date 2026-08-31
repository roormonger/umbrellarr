import {
  ActionIcon,
  Badge,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArtistAlbum, ArtistAlbumTrack } from "@umbrellarr/shared";
import { useMemo, useState } from "react";
import { bulkDeleteArtistFiles, getArtistAlbumTracks } from "@/api/artists";
import { formatFreeSpace } from "@/lib/moviePath";
import { ArtistAlbumTrackDetailsModal } from "./ArtistAlbumTrackDetailsModal";
import classes from "./ArtistAlbumModal.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  instanceId: string;
  artistId: number;
  artistName: string;
  album: ArtistAlbum | null;
};

function formatDuration(ms?: number): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatReleaseDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ArtistAlbumModal({
  opened,
  onClose,
  instanceId,
  artistId,
  artistName,
  album,
}: Props) {
  const queryClient = useQueryClient();
  const [detailsTrack, setDetailsTrack] = useState<ArtistAlbumTrack | null>(null);
  const albumId = album?.id;

  const tracksQuery = useQuery({
    queryKey: ["artist-album-tracks", instanceId, artistId, albumId],
    queryFn: () => getArtistAlbumTracks(instanceId, artistId, albumId!),
    enabled: opened && albumId != null,
  });

  const deleteMutation = useMutation({
    mutationFn: (trackFileId: number) =>
      bulkDeleteArtistFiles(instanceId, { trackFileIds: [trackFileId] }),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Track file deleted" });
      await queryClient.invalidateQueries({
        queryKey: ["artist-album-tracks", instanceId, artistId, albumId],
      });
      await queryClient.invalidateQueries({ queryKey: ["artist-albums", instanceId, artistId] });
      await queryClient.invalidateQueries({
        queryKey: ["artist-manage-files", instanceId, artistId],
      });
      await queryClient.invalidateQueries({ queryKey: ["artist", instanceId, artistId] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Delete failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const data = tracksQuery.data;
  const displayAlbum = data?.album ?? album;
  const resolvedArtistName = data?.artistName || artistName;
  const tracks = data?.tracks ?? [];

  const discs = useMemo(() => {
    const byDisc = new Map<number, ArtistAlbumTrack[]>();
    for (const track of tracks) {
      const disc = track.mediumNumber ?? 1;
      const list = byDisc.get(disc) ?? [];
      list.push(track);
      byDisc.set(disc, list);
    }
    return [...byDisc.entries()].sort((a, b) => a[0] - b[0]);
  }, [tracks]);

  const multiDisc = discs.length > 1;
  const files = displayAlbum?.statistics.trackFileCount ?? 0;
  const total =
    displayAlbum?.statistics.trackCount ?? displayAlbum?.statistics.totalTrackCount ?? tracks.length;
  const size =
    displayAlbum?.statistics.sizeOnDisk != null && displayAlbum.statistics.sizeOnDisk > 0
      ? formatFreeSpace(displayAlbum.statistics.sizeOnDisk)
      : null;

  function handleDelete(track: ArtistAlbumTrack) {
    if (track.trackFileId == null) return;
    if (
      !window.confirm(
        `Delete the track file for “${track.title}”? The track will remain listed as missing.`,
      )
    ) {
      return;
    }
    deleteMutation.mutate(track.trackFileId);
  }

  function renderTrackRows(list: ArtistAlbumTrack[]) {
    return list.map((track) => (
      <Table.Tr key={track.id}>
        <Table.Td>
          <Text size="sm" ff="monospace">
            {track.trackNumber || track.absoluteTrackNumber || "—"}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" className={classes.trackTitle}>
            {track.title}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" c="dimmed" ff="monospace">
            {formatDuration(track.durationMs)}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" c="dimmed">
            {track.audioInfo ?? "—"}
          </Text>
        </Table.Td>
        <Table.Td>
          {track.status ? (
            <Badge size="sm" variant="light" color="teal">
              {track.status}
            </Badge>
          ) : (
            <Text size="sm" c="dimmed">
              —
            </Text>
          )}
        </Table.Td>
        <Table.Td>
          <div className={classes.rowActions}>
            <Tooltip label="Details" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={`Details for ${track.title}`}
                onClick={() => setDetailsTrack(track)}
              >
                <InfoIcon size={16} />
              </ActionIcon>
            </Tooltip>
            {track.hasFile && track.trackFileId != null ? (
              <Tooltip label="Delete track file" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  aria-label={`Delete ${track.title}`}
                  loading={
                    deleteMutation.isPending && deleteMutation.variables === track.trackFileId
                  }
                  onClick={() => handleDelete(track)}
                >
                  <TrashIcon size={16} />
                </ActionIcon>
              </Tooltip>
            ) : null}
          </div>
        </Table.Td>
      </Table.Tr>
    ));
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={displayAlbum?.title ?? "Album"}
        size="xl"
        centered
      >
        <Stack gap="md">
          {displayAlbum && (
            <div className={classes.header}>
              {displayAlbum.coverUrl ? (
                <img
                  className={classes.cover}
                  src={displayAlbum.coverUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className={classes.cover} aria-hidden />
              )}
              <div className={classes.headerBody}>
                <Text fw={700} size="lg" lineClamp={2}>
                  {displayAlbum.title}
                </Text>
                <Text size="sm" c="dimmed">
                  {resolvedArtistName}
                </Text>
                <div className={classes.metaRow}>
                  {displayAlbum.releaseDate ? (
                    <Text size="sm" c="dimmed">
                      {formatReleaseDate(displayAlbum.releaseDate)}
                    </Text>
                  ) : null}
                  <Text size="sm" ff="monospace">
                    {files}/{total}
                  </Text>
                  {size ? (
                    <Text size="sm" c="dimmed">
                      {size}
                    </Text>
                  ) : null}
                  <Badge size="sm" variant="light" color={displayAlbum.monitored ? "violet" : "gray"}>
                    {displayAlbum.monitored ? "Monitored" : "Unmonitored"}
                  </Badge>
                  {displayAlbum.albumType ? (
                    <Badge size="sm" variant="outline" color="gray">
                      {displayAlbum.albumType}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {tracksQuery.isLoading && (
            <Group justify="center" py="md">
              <Loader size="xl" />
            </Group>
          )}
          {tracksQuery.error && (
            <Text c="red" size="sm">
              {tracksQuery.error instanceof Error
                ? tracksQuery.error.message
                : "Failed to load tracks"}
            </Text>
          )}

          {tracksQuery.isSuccess && tracks.length === 0 && (
            <Text c="dimmed" size="sm">
              No tracks reported for this album.
            </Text>
          )}

          {tracksQuery.isSuccess && tracks.length > 0 && (
            <ScrollArea.Autosize mah="55vh" type="hover" offsetScrollbars>
              <Stack gap="sm">
                {discs.map(([discNumber, discTracks]) => {
                  const discFiles = discTracks.filter((t) => t.hasFile).length;
                  return (
                    <div key={discNumber}>
                      {multiDisc && (
                        <div className={classes.discHeader}>
                          <span>
                            CD {discNumber}
                          </span>
                          <Text size="xs" c="dimmed" ff="monospace" span>
                            {discFiles}/{discTracks.length}
                          </Text>
                        </div>
                      )}
                      <Table striped highlightOnHover horizontalSpacing="sm" verticalSpacing={6}>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th w={56}>Track</Table.Th>
                            <Table.Th>Title</Table.Th>
                            <Table.Th w={72}>Duration</Table.Th>
                            <Table.Th w={160}>Audio Info</Table.Th>
                            <Table.Th w={100}>Status</Table.Th>
                            <Table.Th w={72} />
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{renderTrackRows(discTracks)}</Table.Tbody>
                      </Table>
                    </div>
                  );
                })}
              </Stack>
            </ScrollArea.Autosize>
          )}
        </Stack>
      </Modal>

      <ArtistAlbumTrackDetailsModal
        opened={detailsTrack != null}
        onClose={() => setDetailsTrack(null)}
        track={detailsTrack}
        albumTitle={displayAlbum?.title ?? ""}
        artistName={resolvedArtistName}
      />
    </>
  );
}
