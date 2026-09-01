import type { CalendarFeedSettings, CalendarResponse } from "@umbrellarr/shared";
import { api } from "./client";

export const CALENDAR_FEED_QUERY_KEY = ["settings", "calendar-feed"] as const;

export function getCalendar(start: string, end: string, unmonitored = true) {
  const params = new URLSearchParams({
    start,
    end,
    unmonitored: String(unmonitored),
  });
  return api<CalendarResponse>(`/api/calendar?${params}`);
}

export function getCalendarFeedSettings() {
  return api<CalendarFeedSettings>("/api/settings/calendar");
}

export function ensureCalendarFeedToken() {
  return api<CalendarFeedSettings>("/api/settings/calendar/token/ensure", {
    method: "POST",
  });
}

export function regenerateCalendarFeedToken() {
  return api<CalendarFeedSettings>("/api/settings/calendar/token", {
    method: "POST",
  });
}

export function calendarFeedUrl(settings: CalendarFeedSettings | undefined): string {
  if (!settings?.feedPath) return "";
  if (typeof window === "undefined") return settings.feedPath;
  return `${window.location.origin}${settings.feedPath}`;
}
