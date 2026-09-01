import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
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

export function CalendarFeedPanel() {
  const queryClient = useQueryClient();
  const feedQuery = useQuery({
    queryKey: CALENDAR_FEED_QUERY_KEY,
    queryFn: getCalendarFeedSettings,
  });
  const ensureMutation = useMutation({
    mutationFn: ensureCalendarFeedToken,
    onSuccess: (data) => {
      queryClient.setQueryData(CALENDAR_FEED_QUERY_KEY, data);
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Could not create feed link",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
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
    <Stack gap="sm">
      <Text size="sm" c="dimmed" maw={560}>
        One aggregated iCal feed for Radarr, Sonarr, and Lidarr. Subscribe in Apple Calendar,
        Google Calendar, or any app that accepts an HTTPS .ics URL. The token is a secret —
        regenerating it invalidates existing subscriptions.
      </Text>
      {feedQuery.data?.hasToken && feedUrl ? (
        <>
          <TextInput
            label="Feed URL"
            value={feedUrl}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <Group>
            <Button variant="default" onClick={() => void copyUrl()}>
              Copy link
            </Button>
            <Button
              variant="default"
              color="red"
              loading={regenerateMutation.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Regenerate the iCal link? Existing calendar subscriptions will stop working until you update them.",
                  )
                ) {
                  regenerateMutation.mutate();
                }
              }}
            >
              Regenerate
            </Button>
          </Group>
        </>
      ) : (
        <Button
          w="fit-content"
          loading={ensureMutation.isPending || feedQuery.isLoading}
          onClick={() => ensureMutation.mutate()}
        >
          Generate iCal link
        </Button>
      )}
      {feedQuery.isError && (
        <Text size="sm" c="red">
          {feedQuery.error instanceof Error
            ? feedQuery.error.message
            : "Could not load calendar feed settings"}
        </Text>
      )}
    </Stack>
  );
}
