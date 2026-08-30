import { ActionIcon, Table, Text, Tooltip } from "@mantine/core";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import type { ArtistAlbum } from "@umbrellarr/shared";
import { albumTrackCountKind } from "@/lib/albumTrackCountKind";
import classes from "./ArtistAlbumsPanel.module.css";

function formatReleaseDate(value?: string): string {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const parts = value.split("-");
    if (parts.length < 2) return value;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2] ?? "1");
    if (!year || !month) return value;
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "short",
      day: parts[2] ? "numeric" : undefined,
      year: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRating(value?: number): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

type Props = {
  albums: ArtistAlbum[];
  searchingAlbumId?: number;
  monitoringAlbumId?: number;
  onToggleMonitor: (album: ArtistAlbum) => void;
  onSearch: (album: ArtistAlbum) => void;
};

export function ArtistAlbumTable({
  albums,
  searchingAlbumId,
  monitoringAlbumId,
  onToggleMonitor,
  onSearch,
}: Props) {
  if (albums.length === 0) {
    return (
      <Text size="sm" c="dimmed" className={classes.empty}>
        No albums in this group.
      </Text>
    );
  }

  return (
    <Table striped highlightOnHover horizontalSpacing="sm" verticalSpacing={6}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={40} />
          <Table.Th>Title</Table.Th>
          <Table.Th w={140}>Release Date</Table.Th>
          <Table.Th w={72}>Rating</Table.Th>
          <Table.Th w={88}>Status</Table.Th>
          <Table.Th w={48} />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {albums.map((album) => {
          const files = album.statistics.trackFileCount ?? 0;
          const total = album.statistics.trackCount ?? album.statistics.totalTrackCount ?? 0;
          const kind = albumTrackCountKind(album);
          return (
            <Table.Tr key={album.id}>
              <Table.Td>
                <Tooltip
                  label={album.monitored ? "Unmonitor album" : "Monitor album"}
                  withArrow
                >
                  <ActionIcon
                    variant="subtle"
                    color={album.monitored ? "violet" : "gray"}
                    size="sm"
                    aria-label={album.monitored ? "Unmonitor album" : "Monitor album"}
                    loading={monitoringAlbumId === album.id}
                    onClick={() => onToggleMonitor(album)}
                  >
                    <BookmarkSimpleIcon
                      size={16}
                      weight={album.monitored ? "fill" : "regular"}
                    />
                  </ActionIcon>
                </Tooltip>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{album.title}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {formatReleaseDate(album.releaseDate)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{formatRating(album.rating)}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" className={classes.count} data-tone={kind} ff="monospace">
                  {files}/{total}
                </Text>
              </Table.Td>
              <Table.Td>
                <div className={classes.rowActions}>
                  <Tooltip label="Search album" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label={`Search ${album.title}`}
                      loading={searchingAlbumId === album.id}
                      onClick={() => onSearch(album)}
                    >
                      <MagnifyingGlassIcon size={16} />
                    </ActionIcon>
                  </Tooltip>
                </div>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
