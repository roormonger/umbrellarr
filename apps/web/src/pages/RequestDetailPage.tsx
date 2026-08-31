import { Group, Loader, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { MovieCredit } from "@umbrellarr/shared";
import { useState } from "react";
import {
  approveRequest,
  declineRequest,
  getRequestMediaPage,
} from "@/api/requests";
import { APP_LOADER_SIZE } from "@/components/QuantumLoader";
import { MovieDetailCredits } from "@/components/movies/detail/MovieDetailCredits";
import { RequestDetailHero } from "@/components/requests/RequestDetailHero";
import { RequestDetailSeasons } from "@/components/requests/RequestDetailSeasons";
import { RequestDetailToolbar } from "@/components/requests/RequestDetailToolbar";
import { RequestEditModal } from "@/components/requests/RequestEditModal";
import { usePageHeader } from "@/layout/pageHeader";
import classes from "./MovieDetailPage.module.css";

export function RequestDetailPage() {
  const queryClient = useQueryClient();
  const { instanceId, requestId: requestIdParam } = useParams({
    from: "/app/requests/$instanceId/$requestId",
  });
  const requestId = Number(requestIdParam);
  const [editOpen, setEditOpen] = useState(false);

  const pageQuery = useQuery({
    queryKey: ["request-page", instanceId, requestId],
    queryFn: () => getRequestMediaPage(instanceId, requestId),
    enabled: Number.isFinite(requestId),
  });

  const title = pageQuery.data
    ? pageQuery.data.media.year
      ? `${pageQuery.data.media.title} (${pageQuery.data.media.year})`
      : pageQuery.data.media.title
    : "Request";
  usePageHeader(title, null, `/requests/${instanceId}`);

  const approveMutation = useMutation({
    mutationFn: () => approveRequest(instanceId, requestId),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Request approved" });
      await queryClient.invalidateQueries({ queryKey: ["request-page", instanceId, requestId] });
      await queryClient.invalidateQueries({ queryKey: ["requests", instanceId] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Approve failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => declineRequest(instanceId, requestId),
    onSuccess: async () => {
      notifications.show({ color: "blue", message: "Request declined" });
      await queryClient.invalidateQueries({ queryKey: ["request-page", instanceId, requestId] });
      await queryClient.invalidateQueries({ queryKey: ["requests", instanceId] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Decline failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  if (!Number.isFinite(requestId)) {
    return <Text className={classes.error}>Invalid request id</Text>;
  }

  return (
    <div className={classes.page}>
      {pageQuery.isLoading && (
        <Group justify="center" py="xl">
          <Loader size={APP_LOADER_SIZE} />
        </Group>
      )}

      {pageQuery.error && (
        <Text className={classes.error}>
          {pageQuery.error instanceof Error
            ? pageQuery.error.message
            : "Failed to load request"}
        </Text>
      )}

      {pageQuery.data && (
        <Stack gap="xl">
          <RequestDetailToolbar
            pending={pageQuery.data.request.status === "pending"}
            approving={approveMutation.isPending}
            declining={declineMutation.isPending}
            onViewRequest={() => setEditOpen(true)}
            onApprove={() => approveMutation.mutate()}
            onDecline={() => declineMutation.mutate()}
          />
          <RequestDetailHero
            media={pageQuery.data.media}
            requestStatus={pageQuery.data.request.status}
            requestedBy={pageQuery.data.request.requestedBy?.displayName}
          />
          {pageQuery.data.media.mediaType === "tv" ? (
            <RequestDetailSeasons seasons={pageQuery.data.media.seasons} />
          ) : null}
          <MovieDetailCredits
            cast={pageQuery.data.media.cast as MovieCredit[]}
            crew={pageQuery.data.media.crew as MovieCredit[]}
          />
        </Stack>
      )}

      <RequestEditModal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        instanceId={instanceId}
        request={pageQuery.data?.request ?? null}
      />
    </div>
  );
}
