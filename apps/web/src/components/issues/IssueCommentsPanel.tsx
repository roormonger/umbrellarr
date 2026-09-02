import { Avatar, Button, Group, Stack, Text, Textarea } from "@mantine/core";
import { ChatCircleIcon } from "@phosphor-icons/react/dist/csr/ChatCircle";
import type { IssueComment } from "@umbrellarr/shared";
import { useState } from "react";
import panel from "@/components/movies/detail/MovieDetailPanel.module.css";
import { formatRelativeTime } from "@/lib/issueDisplay";
import classes from "./IssueCommentsPanel.module.css";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function CommentRow({ comment }: { comment: IssueComment }) {
  const author = comment.user?.displayName ?? "Unknown user";
  const timestamp = comment.createdAt ? formatRelativeTime(comment.createdAt) : undefined;

  return (
    <article className={classes.comment}>
      <Avatar src={comment.user?.avatar} radius="xl" size={36} color="violet">
        {initials(author)}
      </Avatar>
      <div className={classes.commentBody}>
        <Group gap="xs" wrap="wrap">
          <Text size="sm" fw={600}>
            {author}
          </Text>
          {timestamp ? (
            <Text size="xs" c="dimmed">
              {timestamp}
            </Text>
          ) : null}
        </Group>
        <Text size="sm" className={classes.message}>
          {comment.message}
        </Text>
      </div>
    </article>
  );
}

type Props = {
  comments: IssueComment[];
  posting?: boolean;
  onPostComment: (message: string) => void;
};

export function IssueCommentsPanel({ comments, posting, onPostComment }: Props) {
  const [draft, setDraft] = useState("");

  function submit() {
    const message = draft.trim();
    if (!message) return;
    onPostComment(message);
    setDraft("");
  }

  return (
    <section className={panel.panel}>
      <Text className={panel.heading}>Comments</Text>
      <div className={panel.stack}>
        {comments.length === 0 ? (
          <Text size="sm" c="dimmed">
            No comments.
          </Text>
        ) : (
          <Stack gap="md">
            {comments.map((comment) => (
              <CommentRow key={comment.id} comment={comment} />
            ))}
          </Stack>
        )}

        <div className={classes.compose}>
          <Textarea
            placeholder="Add a comment…"
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            minRows={3}
            autosize
            disabled={posting}
          />
          <Group justify="flex-end">
            <Button
              color="violet"
              leftSection={<ChatCircleIcon size={16} />}
              loading={posting}
              disabled={!draft.trim()}
              onClick={submit}
            >
              Comment
            </Button>
          </Group>
        </div>
      </div>
    </section>
  );
}
