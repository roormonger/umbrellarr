import { Group, Loader, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { deleteSeries, getSeriesDetail, refreshSeries, searchSeries } from "@/api/shows";
import { ShowDetailHero } from "@/components/shows/detail/ShowDetailHero";
import { ShowDetailToolbar } from "@/components/shows/detail/ShowDetailToolbar";
import { ShowEditModal } from "@/components/shows/ShowEditModal";
import { ShowHistoryModal } from "@/components/shows/ShowHistoryModal";
import { ShowInteractiveSearchModal } from "@/components/shows/ShowInteractiveSearchModal";
import { ShowManageFilesModal } from "@/components/shows/ShowManageFilesModal";
import { ShowOrganizeModal } from "@/components/shows/ShowOrganizeModal";
import { usePageHeader } from "@/layout/pageHeader";
import classes from "./MovieDetailPage.module.css";

export function ShowDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { instanceId, seriesId: seriesIdParam } = useParams({
    from: "/app/shows/$instanceId/$seriesId",
  });
  const seriesId = Number(seriesIdParam);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [interactiveOpen, setInteractiveOpen] = useState(false);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [manageFilesOpen, setManageFilesOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["series", instanceId, seriesId],
    queryFn: () => getSeriesDetail(instanceId, seriesId),
    enabled: Number.isFinite(seriesId),
  });

  const refreshMutation = useMutation({
    mutationFn: () => refreshSeries(instanceId, seriesId),
    onSuccess: async () => {
      notifications.show({
        color: "blue",
        message: `Refreshing “${detailQuery.data?.title ?? "series"}” in Sonarr`,
      });
      await queryClient.invalidateQueries({ queryKey: ["series", instanceId, seriesId] });
      await queryClient.invalidateQueries({ queryKey: ["shows"] });
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
    mutationFn: () => searchSeries(instanceId, seriesId),
    onSuccess: () => {
      notifications.show({
        color: "blue",
        message: `Searching for “${detailQuery.data?.title ?? "series"}” in Sonarr`,
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
    mutationFn: () => deleteSeries(instanceId, seriesId, false),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Show removed from Sonarr" });
      await queryClient.invalidateQueries({ queryKey: ["shows"] });
      void navigate({
        to: "/shows/$instanceId",
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

  const title = detailQuery.data
    ? detailQuery.data.year
      ? `${detailQuery.data.title} (${detailQuery.data.year})`
      : detailQuery.data.title
    : "Show";
  usePageHeader(title, null, `/shows/${instanceId}`);

  if (!Number.isFinite(seriesId)) {
    return <Text className={classes.error}>Invalid series id</Text>;
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
            : "Failed to load show"}
        </Text>
      )}

      {detailQuery.data && (
        <Stack gap="xl">
          <ShowDetailToolbar
            refreshing={refreshMutation.isPending}
            searching={searchMutation.isPending}
            deleting={deleteMutation.isPending}
            hasFiles={(detailQuery.data.episodeFileCount ?? 0) > 0}
            onRefreshScan={() => refreshMutation.mutate()}
            onSearchSeries={() => searchMutation.mutate()}
            onInteractiveSearch={() => setInteractiveOpen(true)}
            onPreviewRename={() => setOrganizeOpen(true)}
            onManageFiles={() => setManageFilesOpen(true)}
            onHistory={() => setHistoryOpen(true)}
            onEdit={() => setEditOpen(true)}
            onDelete={() => {
              if (
                window.confirm(
                  `Remove "${detailQuery.data.title}" from Sonarr? Episode files on disk will be kept.`,
                )
              ) {
                deleteMutation.mutate();
              }
            }}
          />
          <ShowDetailHero series={detailQuery.data} />
        </Stack>
      )}

      {detailQuery.data && (
        <>
          <ShowEditModal
            opened={editOpen}
            instanceId={instanceId}
            seriesId={seriesId}
            title={detailQuery.data.title}
            onClose={() => setEditOpen(false)}
          />
          <ShowHistoryModal
            opened={historyOpen}
            onClose={() => setHistoryOpen(false)}
            instanceId={instanceId}
            seriesId={seriesId}
          />
          <ShowInteractiveSearchModal
            opened={interactiveOpen}
            onClose={() => setInteractiveOpen(false)}
            instanceId={instanceId}
            seriesId={seriesId}
            title={detailQuery.data.title}
            year={detailQuery.data.year}
          />
          <ShowOrganizeModal
            opened={organizeOpen}
            onClose={() => setOrganizeOpen(false)}
            instanceId={instanceId}
            seriesId={seriesId}
            seriesPath={detailQuery.data.path}
            seriesType={detailQuery.data.seriesType}
          />
          <ShowManageFilesModal
            opened={manageFilesOpen}
            onClose={() => setManageFilesOpen(false)}
            instanceId={instanceId}
            seriesId={seriesId}
            title={detailQuery.data.title}
          />
        </>
      )}
    </div>
  );
}
