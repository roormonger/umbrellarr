import { Group, Loader, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { addIssueComment, getIssueDetail, resolveIssue } from "@/api/issues";
import { APP_LOADER_SIZE } from "@/components/QuantumLoader";
import { IssueCommentsPanel } from "@/components/issues/IssueCommentsPanel";
import { IssueDetailHero } from "@/components/issues/IssueDetailHero";
import { usePageHeader } from "@/layout/pageHeader";
import classes from "./MovieDetailPage.module.css";

export function IssueDetailPage() {
  const queryClient = useQueryClient();
  const { instanceId, issueId: issueIdParam } = useParams({
    from: "/app/issues/$instanceId/$issueId",
  });
  const issueId = Number(issueIdParam);
  const issueQueryKey = ["issue", instanceId, issueId] as const;

  const detailQuery = useQuery({
    queryKey: issueQueryKey,
    queryFn: () => getIssueDetail(instanceId, issueId),
    enabled: Number.isFinite(issueId),
  });

  const title = detailQuery.data
    ? detailQuery.data.year
      ? `${detailQuery.data.title} (${detailQuery.data.year})`
      : detailQuery.data.title
    : "Issue";
  usePageHeader(title, null, `/issues?instance=${instanceId}`);

  const resolveMutation = useMutation({
    mutationFn: () => resolveIssue(instanceId, issueId),
    onSuccess: async (data) => {
      notifications.show({ color: "green", message: "Issue closed" });
      queryClient.setQueryData(issueQueryKey, data);
      await queryClient.invalidateQueries({ queryKey: ["issues", "unified"] });
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Could not close issue",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (message: string) => addIssueComment(instanceId, issueId, message),
    onSuccess: async (data) => {
      queryClient.setQueryData(issueQueryKey, data);
      await queryClient.invalidateQueries({ queryKey: ["issues", "unified"] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Comment failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  if (!Number.isFinite(issueId)) {
    return <Text className={classes.error}>Invalid issue id</Text>;
  }

  return (
    <div className={classes.page}>
      {detailQuery.isLoading && (
        <Group justify="center" py="xl">
          <Loader size={APP_LOADER_SIZE} />
        </Group>
      )}

      {detailQuery.error && (
        <Text className={classes.error}>
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : "Failed to load issue"}
        </Text>
      )}

      {detailQuery.data && (
        <Stack gap="xl">
          <IssueDetailHero
            issue={detailQuery.data}
            closing={resolveMutation.isPending}
            onCloseIssue={() => resolveMutation.mutate()}
          />
          <IssueCommentsPanel
            comments={detailQuery.data.comments}
            posting={commentMutation.isPending}
            onPostComment={(message) => commentMutation.mutate(message)}
          />
        </Stack>
      )}
    </div>
  );
}
