import { Group, Loader, Text } from "@mantine/core";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArtistAlbum, ArtistAlbumTypeGroup } from "@umbrellarr/shared";
import { useState } from "react";
import { getArtistAlbums, searchAlbum, setAlbumsMonitored } from "@/api/artists";
import { albumTypeStats } from "@/lib/albumTrackCountKind";
import { formatFreeSpace } from "@/lib/moviePath";
import { ArtistAlbumTable } from "./ArtistAlbumTable";
import classes from "./ArtistAlbumsPanel.module.css";

type Props = {
  instanceId: string;
  artistId: number;
};

type AlbumsResponse = { groups: ArtistAlbumTypeGroup[] };

export function ArtistAlbumsPanel({ instanceId, artistId }: Props) {
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const albumsQuery = useQuery({
    queryKey: ["artist-albums", instanceId, artistId],
    queryFn: () => getArtistAlbums(instanceId, artistId),
    refetchInterval: 10_000,
    refetchOnWindowFocus: "always",
  });

  const monitorMutation = useMutation({
    mutationFn: ({ album, monitored }: { album: ArtistAlbum; monitored: boolean }) =>
      setAlbumsMonitored(instanceId, artistId, { albumIds: [album.id], monitored }),
    onMutate: async ({ album, monitored }) => {
      const key = ["artist-albums", instanceId, artistId] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AlbumsResponse>(key);
      queryClient.setQueryData<AlbumsResponse>(key, (current) => {
        if (!current) return current;
        return {
          groups: current.groups.map((group) => ({
            ...group,
            albums: group.albums.map((item) =>
              item.id === album.id ? { ...item, monitored } : item,
            ),
          })),
        };
      });
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["artist-albums", instanceId, artistId], context.previous);
      }
      notifications.show({
        color: "red",
        title: "Monitor failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["artist-albums", instanceId, artistId] });
      await queryClient.invalidateQueries({ queryKey: ["artist", instanceId, artistId] });
      await queryClient.invalidateQueries({ queryKey: ["artists"] });
    },
  });

  const searchMutation = useMutation({
    mutationFn: (album: ArtistAlbum) => searchAlbum(instanceId, artistId, album.id),
    onSuccess: (_data, album) => {
      notifications.show({
        color: "blue",
        message: `Searching “${album.title}” in Lidarr`,
      });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  function toggleSection(albumType: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(albumType)) next.delete(albumType);
      else next.add(albumType);
      return next;
    });
  }

  const groups = albumsQuery.data?.groups ?? [];

  return (
    <section className={classes.panel} aria-label="Albums">
      {albumsQuery.isLoading && (
        <Group justify="center" py="md">
          <Loader size="sm" />
        </Group>
      )}
      {albumsQuery.error && (
        <Text c="red" size="sm">
          {albumsQuery.error instanceof Error
            ? albumsQuery.error.message
            : "Failed to load albums"}
        </Text>
      )}
      {albumsQuery.isSuccess && groups.length === 0 && (
        <Text c="dimmed" size="sm">
          No albums reported by Lidarr.
        </Text>
      )}
      {groups.map((group) => {
        const isOpen = !collapsed.has(group.albumType);
        const stats = albumTypeStats(group.albums);
        const size =
          stats.sizeOnDisk > 0 ? formatFreeSpace(stats.sizeOnDisk) : null;
        return (
          <div key={group.albumType} className={classes.section}>
            <div className={classes.header}>
              <button
                type="button"
                className={classes.expand}
                aria-expanded={isOpen}
                onClick={() => toggleSection(group.albumType)}
              >
                <span className={classes.chevron} data-open={isOpen || undefined}>
                  <CaretDownIcon size={16} />
                </span>
                <span className={classes.title}>{group.albumType}</span>
                <span className={classes.meta}>
                  <span className={classes.count} data-tone={stats.kind}>
                    {stats.trackFileCount}/{stats.trackCount}
                  </span>
                  {size ? <span>{size}</span> : null}
                </span>
              </button>
            </div>
            {isOpen && (
              <div className={classes.body}>
                <ArtistAlbumTable
                  albums={group.albums}
                  searchingAlbumId={
                    searchMutation.isPending ? searchMutation.variables?.id : undefined
                  }
                  monitoringAlbumId={
                    monitorMutation.isPending ? monitorMutation.variables?.album.id : undefined
                  }
                  onToggleMonitor={(album) =>
                    monitorMutation.mutate({ album, monitored: !album.monitored })
                  }
                  onSearch={(album) => searchMutation.mutate(album)}
                />
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
