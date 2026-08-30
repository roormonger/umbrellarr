import { Group, Loader, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { deleteArtist, getArtistDetail, refreshArtist, searchArtist } from "@/api/artists";
import { ArtistEditModal } from "@/components/artists/ArtistEditModal";
import { ArtistAlbumsPanel } from "@/components/artists/detail/ArtistAlbumsPanel";
import { ArtistDetailHero } from "@/components/artists/detail/ArtistDetailHero";
import { ArtistDetailToolbar } from "@/components/artists/detail/ArtistDetailToolbar";
import { ArtistHistoryModal } from "@/components/artists/ArtistHistoryModal";
import { ArtistInteractiveSearchModal } from "@/components/artists/ArtistInteractiveSearchModal";
import { ArtistManageFilesModal } from "@/components/artists/ArtistManageFilesModal";
import { ArtistMonitoringModal } from "@/components/artists/ArtistMonitoringModal";
import { ArtistOrganizeModal } from "@/components/artists/ArtistOrganizeModal";
import { ArtistRetagModal } from "@/components/artists/ArtistRetagModal";
import { usePageHeader } from "@/layout/pageHeader";
import classes from "./MovieDetailPage.module.css";

export function ArtistDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { instanceId, artistId: artistIdParam } = useParams({
    from: "/app/music/$instanceId/$artistId",
  });
  const artistId = Number(artistIdParam);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [interactiveOpen, setInteractiveOpen] = useState(false);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [retagOpen, setRetagOpen] = useState(false);
  const [manageFilesOpen, setManageFilesOpen] = useState(false);
  const [monitoringOpen, setMonitoringOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["artist", instanceId, artistId],
    queryFn: () => getArtistDetail(instanceId, artistId),
    enabled: Number.isFinite(artistId),
  });

  const refreshMutation = useMutation({
    mutationFn: () => refreshArtist(instanceId, artistId),
    onSuccess: async () => {
      notifications.show({
        color: "blue",
        message: `Refreshing “${detailQuery.data?.title ?? "artist"}” in Lidarr`,
      });
      await queryClient.invalidateQueries({ queryKey: ["artist", instanceId, artistId] });
      await queryClient.invalidateQueries({ queryKey: ["artist-albums", instanceId, artistId] });
      await queryClient.invalidateQueries({ queryKey: ["artists"] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Refresh failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const searchMutation = useMutation({
    mutationFn: () => searchArtist(instanceId, artistId),
    onSuccess: () => {
      notifications.show({
        color: "blue",
        message: `Searching monitored albums for “${detailQuery.data?.title ?? "artist"}” in Lidarr`,
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

  const deleteMutation = useMutation({
    mutationFn: () => deleteArtist(instanceId, artistId, false),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Artist removed from Lidarr" });
      await queryClient.invalidateQueries({ queryKey: ["artists"] });
      void navigate({
        to: "/music/$instanceId",
        params: { instanceId },
      });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Delete failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const title = detailQuery.data?.title ?? "Artist";
  usePageHeader(title, null, `/music/${instanceId}`);

  if (!Number.isFinite(artistId)) {
    return <Text className={classes.error}>Invalid artist id</Text>;
  }

  return (
    <div className={classes.page}>
      {detailQuery.isLoading && (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      )}

      {detailQuery.error && (
        <Text className={classes.error}>
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : "Failed to load artist"}
        </Text>
      )}

      {detailQuery.data && (
        <Stack gap="xl">
          <ArtistDetailToolbar
            refreshing={refreshMutation.isPending}
            searching={searchMutation.isPending}
            deleting={deleteMutation.isPending}
            hasFiles={(detailQuery.data.trackFileCount ?? 0) > 0}
            onRefreshScan={() => refreshMutation.mutate()}
            onSearchMonitored={() => searchMutation.mutate()}
            onInteractiveSearch={() => setInteractiveOpen(true)}
            onPreviewRename={() => setOrganizeOpen(true)}
            onPreviewRetag={() => setRetagOpen(true)}
            onManageTracks={() => setManageFilesOpen(true)}
            onHistory={() => setHistoryOpen(true)}
            onArtistMonitoring={() => setMonitoringOpen(true)}
            onEdit={() => setEditOpen(true)}
            onDelete={() => {
              if (
                window.confirm(
                  `Remove "${detailQuery.data.title}" from Lidarr? Track files on disk will be kept.`,
                )
              ) {
                deleteMutation.mutate();
              }
            }}
          />
          <ArtistDetailHero artist={detailQuery.data} />
          <ArtistAlbumsPanel instanceId={instanceId} artistId={artistId} />
        </Stack>
      )}

      {detailQuery.data && (
        <>
          <ArtistEditModal
            opened={editOpen}
            instanceId={instanceId}
            artistId={artistId}
            title={detailQuery.data.title}
            onClose={() => setEditOpen(false)}
            onDeleted={() => {
              void navigate({
                to: "/music/$instanceId",
                params: { instanceId },
              });
            }}
          />
          <ArtistHistoryModal
            opened={historyOpen}
            onClose={() => setHistoryOpen(false)}
            instanceId={instanceId}
            artistId={artistId}
          />
          <ArtistInteractiveSearchModal
            opened={interactiveOpen}
            onClose={() => setInteractiveOpen(false)}
            instanceId={instanceId}
            artistId={artistId}
            title={detailQuery.data.title}
          />
          <ArtistOrganizeModal
            opened={organizeOpen}
            onClose={() => setOrganizeOpen(false)}
            instanceId={instanceId}
            artistId={artistId}
          />
          <ArtistRetagModal
            opened={retagOpen}
            onClose={() => setRetagOpen(false)}
            instanceId={instanceId}
            artistId={artistId}
          />
          <ArtistManageFilesModal
            opened={manageFilesOpen}
            onClose={() => setManageFilesOpen(false)}
            instanceId={instanceId}
            artistId={artistId}
          />
          <ArtistMonitoringModal
            opened={monitoringOpen}
            onClose={() => setMonitoringOpen(false)}
            instanceId={instanceId}
            artistId={artistId}
            title={detailQuery.data.title}
          />
        </>
      )}
    </div>
  );
}
