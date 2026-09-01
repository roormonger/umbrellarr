import type { CalendarEvent } from "@umbrellarr/shared";
import { eventFallsOnDay, sameDay } from "@/lib/calendarDates";
import { CalendarEventChip } from "./CalendarEventChip";
import classes from "./CalendarColumnView.module.css";

export function CalendarColumnView({
  days,
  events,
  onOpenDay,
}: {
  days: Date[];
  events: CalendarEvent[];
  onOpenDay?: (day: Date) => void;
}) {
  const today = new Date();

  return (
    <div
      className={classes.columns}
      style={{ ["--calendar-cols" as string]: String(days.length) }}
      data-calendar-view={days.length === 1 ? "day" : days.length === 14 ? "forecast" : "week"}
    >
      {days.map((day) => {
        const dayEvents = events.filter((event) => eventFallsOnDay(event.start, event.allDay, day));
        const isToday = sameDay(day, today);
        return (
          <section
            key={day.toISOString()}
            className={`${classes.column} ${isToday ? classes.today : ""}`}
            aria-label={day.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          >
            {onOpenDay ? (
              <button
                type="button"
                className={classes.heading}
                onClick={() => onOpenDay(day)}
              >
                <span className={classes.weekday}>
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className={classes.date}>
                  {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </button>
            ) : (
              <div className={classes.heading}>
                <span className={classes.weekday}>
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className={classes.date}>
                  {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            )}
            <div className={classes.events}>
              {dayEvents.length === 0 ? (
                <span className={classes.empty}>No events</span>
              ) : (
                dayEvents.map((event) => (
                  <CalendarEventChip key={event.id} event={event} expanded />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
