import { Group, Loader, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { deleteMovie, getMovieDetail, refreshMovie, searchMovie } from "@/api/movies";
import { MovieDetailCredits } from "@/components/movies/detail/MovieDetailCredits";
import { MovieDetailFiles } from "@/components/movies/detail/MovieDetailFiles";
import { MovieDetailHero } from "@/components/movies/detail/MovieDetailHero";
import { MovieDetailTitles } from "@/components/movies/detail/MovieDetailTitles";
import { MovieDetailToolbar } from "@/components/movies/detail/MovieDetailToolbar";
import { MovieEditModal } from "@/components/movies/MovieEditModal";
import { MovieHistoryModal } from "@/components/movies/MovieHistoryModal";
import { MovieInteractiveSearchModal } from "@/components/movies/MovieInteractiveSearchModal";
import { MovieManageFilesModal } from "@/components/movies/MovieManageFilesModal";
import { MovieOrganizeModal } from "@/components/movies/MovieOrganizeModal";
import { usePageHeader } from "@/layout/pageHeader";
import classes from "./MovieDetailPage.module.css";

export function MovieDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { instanceId, movieId: movieIdParam } = useParams({
    from: "/app/movies/$instanceId/$movieId",
  });
  const movieId = Number(movieIdParam);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [interactiveOpen, setInteractiveOpen] = useState(false);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [manageFilesOpen, setManageFilesOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["movie", instanceId, movieId],
    queryFn: () => getMovieDetail(instanceId, movieId),
    enabled: Number.isFinite(movieId),
  });

  const refreshMutation = useMutation({
    mutationFn: () => refreshMovie(instanceId, movieId),
    onSuccess: async () => {
      notifications.show({
        color: "blue",
        message: `Refreshing “${detailQuery.data?.title ?? "movie"}” in Radarr`,
      });
      await queryClient.invalidateQueries({ queryKey: ["movie", instanceId, movieId] });
      await queryClient.invalidateQueries({ queryKey: ["movies"] });
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
    mutationFn: () => searchMovie(instanceId, movieId),
    onSuccess: () => {
      notifications.show({
        color: "blue",
        message: `Searching for “${detailQuery.data?.title ?? "movie"}” in Radarr`,
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
    mutationFn: () => deleteMovie(instanceId, movieId, false),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Movie removed from Radarr" });
      await queryClient.invalidateQueries({ queryKey: ["movies"] });
      void navigate({
        to: "/movies/$instanceId",
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
    : "Movie";
  usePageHeader(title, null, `/movies/${instanceId}`);

  if (!Number.isFinite(movieId)) {
    return <Text className={classes.error}>Invalid movie id</Text>;
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
            : "Failed to load movie"}
        </Text>
      )}

      {detailQuery.data && (
        <Stack gap="xl">
          <MovieDetailToolbar
            refreshing={refreshMutation.isPending}
            searching={searchMutation.isPending}
            deleting={deleteMutation.isPending}
            hasFiles={detailQuery.data.files.length > 0}
            onRefreshScan={() => refreshMutation.mutate()}
            onSearchMovie={() => searchMutation.mutate()}
            onInteractiveSearch={() => setInteractiveOpen(true)}
            onPreviewRename={() => setOrganizeOpen(true)}
            onManageFiles={() => setManageFilesOpen(true)}
            onHistory={() => setHistoryOpen(true)}
            onEdit={() => setEditOpen(true)}
            onDelete={() => {
              if (
                window.confirm(
                  `Remove "${detailQuery.data.title}" from Radarr? Movie files on disk will be kept.`,
                )
              ) {
                deleteMutation.mutate();
              }
            }}
          />
          <MovieDetailHero movie={detailQuery.data} />
          <MovieDetailFiles
            files={detailQuery.data.files}
            extraFiles={detailQuery.data.extraFiles}
          />
          <MovieDetailCredits cast={detailQuery.data.cast} crew={detailQuery.data.crew} />
          <MovieDetailTitles titles={detailQuery.data.alternativeTitles} />
        </Stack>
      )}

      {detailQuery.data && (
        <>
          <MovieEditModal
            opened={editOpen}
            instanceId={instanceId}
            movieId={movieId}
            title={detailQuery.data.title}
            onClose={() => setEditOpen(false)}
          />
          <MovieHistoryModal
            opened={historyOpen}
            onClose={() => setHistoryOpen(false)}
            instanceId={instanceId}
            movieId={movieId}
          />
          <MovieInteractiveSearchModal
            opened={interactiveOpen}
            onClose={() => setInteractiveOpen(false)}
            instanceId={instanceId}
            movieId={movieId}
            title={detailQuery.data.title}
            year={detailQuery.data.year}
          />
          <MovieOrganizeModal
            opened={organizeOpen}
            onClose={() => setOrganizeOpen(false)}
            instanceId={instanceId}
            movieId={movieId}
            moviePath={detailQuery.data.path}
          />
          <MovieManageFilesModal
            opened={manageFilesOpen}
            onClose={() => setManageFilesOpen(false)}
            instanceId={instanceId}
            movieId={movieId}
            title={detailQuery.data.title}
          />
        </>
      )}
    </div>
  );
}
