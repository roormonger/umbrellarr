import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  CALENDAR_FEED_QUERY_KEY,
  calendarFeedUrl,
  ensureCalendarFeedToken,
  getCalendarFeedSettings,
  regenerateCalendarFeedToken,
} from "@/api/calendar";

export function CalendarIcalModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const feedQuery = useQuery({
    queryKey: CALENDAR_FEED_QUERY_KEY,
    queryFn: async () => {
      const current = await getCalendarFeedSettings();
      if (current.hasToken) return current;
      return ensureCalendarFeedToken();
    },
    enabled: opened,
  });
  const regenerateMutation = useMutation({
    mutationFn: regenerateCalendarFeedToken,
    onSuccess: (data) => {
      queryClient.setQueryData(CALENDAR_FEED_QUERY_KEY, data);
      notifications.show({ color: "green", message: "Calendar feed link regenerated" });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Could not regenerate feed link",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const feedUrl = useMemo(() => calendarFeedUrl(feedQuery.data), [feedQuery.data]);

  async function copyUrl() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      notifications.show({ color: "green", message: "iCal link copied" });
    } catch {
      notifications.show({ color: "red", message: "Could not copy link" });
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="iCal Link" centered>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Subscribe to one Umbrellarr feed that merges Radarr, Sonarr, and Lidarr calendars.
          Keep this URL private — it is a secret token, not your Arr API keys.
        </Text>
        <TextInput
          label="Feed URL"
          value={feedQuery.isLoading && !feedUrl ? "Generating…" : feedUrl}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
        {feedQuery.isError && (
          <Text size="sm" c="red">
            {feedQuery.error instanceof Error
              ? feedQuery.error.message
              : "Could not create feed link"}
          </Text>
        )}
        <Group justify="space-between">
          <Button
            variant="default"
            color="red"
            onClick={() => {
              if (
                window.confirm(
                  "Regenerate the iCal link? Existing calendar subscriptions will stop working until you update them.",
                )
              ) {
                regenerateMutation.mutate();
              }
            }}
            loading={regenerateMutation.isPending}
            disabled={!feedUrl}
          >
            Regenerate
          </Button>
          <Button onClick={() => void copyUrl()} disabled={!feedUrl}>
            Copy link
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
