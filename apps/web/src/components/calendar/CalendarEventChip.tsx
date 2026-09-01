import type { CalendarEvent } from "@umbrellarr/shared";
import { useNavigate } from "@tanstack/react-router";
import { calendarStatusColor } from "@/lib/calendarStatus";
import { eventAriaLabel, eventSubtitle, eventTimeLabel } from "./calendarEventCopy";
import classes from "./CalendarEventChip.module.css";

export function CalendarEventChip({
  event,
  expanded = false,
}: {
  event: CalendarEvent;
  expanded?: boolean;
}) {
  const navigate = useNavigate();
  const subtitle = eventSubtitle(event, !expanded);
  const time = eventTimeLabel(event);

  function openDetail() {
    if (event.kind === "movie") {
      void navigate({
        to: "/movies/$instanceId/$movieId",
        params: { instanceId: event.instanceId, movieId: String(event.externalId) },
      });
      return;
    }
    if (event.kind === "episode") {
      void navigate({
        to: "/shows/$instanceId/$seriesId",
        params: { instanceId: event.instanceId, seriesId: String(event.externalId) },
      });
      return;
    }
    void navigate({
      to: "/music/$instanceId/$artistId",
      params: { instanceId: event.instanceId, artistId: String(event.externalId) },
    });
  }

  return (
    <button
      type="button"
      className={`${classes.chip} ${expanded ? classes.expanded : ""}`}
      style={{ backgroundColor: calendarStatusColor(event.status) }}
      aria-label={eventAriaLabel(event)}
      data-calendar-event={event.kind}
      onClick={openDetail}
    >
      <span className={classes.title}>{event.title}</span>
      {(subtitle || time) && (
        <span className={classes.meta}>{[time, subtitle].filter(Boolean).join(" · ")}</span>
      )}
    </button>
  );
}
