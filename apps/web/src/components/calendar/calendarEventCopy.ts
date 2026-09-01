import type { CalendarEvent } from "@umbrellarr/shared";
import { formatEventTime, formatTimeRange } from "@/lib/calendarDates";

export function episodeCode(event: CalendarEvent): string | undefined {
  if (event.kind !== "episode" || event.seasonNumber == null || event.episodeNumber == null) {
    return undefined;
  }
  return `S${String(event.seasonNumber).padStart(2, "0")}E${String(event.episodeNumber).padStart(2, "0")}`;
}

export function releaseTypeLabel(type: CalendarEvent["releaseType"]): string | undefined {
  switch (type) {
    case "cinema":
      return "Cinemas";
    case "digital":
      return "Digital";
    case "physical":
      return "Physical";
    case "tba":
      return "TBA";
    default:
      return undefined;
  }
}

export function eventSubtitle(event: CalendarEvent, compact: boolean): string {
  if (event.kind === "movie") {
    return releaseTypeLabel(event.releaseType) ?? "";
  }
  if (event.kind === "episode") {
    const code = episodeCode(event);
    if (compact) return code ?? event.secondaryTitle ?? "";
    return [code, event.secondaryTitle].filter(Boolean).join(" · ");
  }
  if (compact) return event.secondaryTitle ?? event.albumType ?? "";
  return [event.secondaryTitle, event.albumType].filter(Boolean).join(" · ");
}

export function eventTimeLabel(event: CalendarEvent): string {
  if (event.allDay) return "";
  return formatTimeRange(event.start, event.end, false) || formatEventTime(event.start, false);
}

export function eventAriaLabel(event: CalendarEvent): string {
  const parts = [event.title, eventSubtitle(event, false), eventTimeLabel(event)].filter(Boolean);
  return parts.join(" — ");
}
