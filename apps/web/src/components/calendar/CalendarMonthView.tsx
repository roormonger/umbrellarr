import type { CalendarEvent } from "@umbrellarr/shared";
import { eventFallsOnDay, sameDay, startOfMonth } from "@/lib/calendarDates";
import { CalendarEventChip } from "./CalendarEventChip";
import classes from "./CalendarMonthView.module.css";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_CELL_CAP = 4;

export function CalendarMonthView({
  days,
  events,
  anchor,
  onOpenDay,
}: {
  days: Date[];
  events: CalendarEvent[];
  anchor: Date;
  onOpenDay: (day: Date) => void;
}) {
  const monthStart = startOfMonth(anchor);
  const today = new Date();
  const cap = MONTH_CELL_CAP;

  return (
    <div className={classes.grid} role="grid" aria-label="Calendar" data-calendar-view="month">
      {WEEKDAYS.map((label) => (
        <div key={label} className={classes.weekday} role="columnheader">
          {label.slice(0, 3)}
        </div>
      ))}
      {days.map((day) => {
        const outside = day.getMonth() !== monthStart.getMonth();
        const isToday = sameDay(day, today);
        const dayEvents = events.filter((event) => eventFallsOnDay(event.start, event.allDay, day));
        const visible = dayEvents.slice(0, cap);
        const overflow = dayEvents.length - visible.length;
        const cellClass = [
          classes.cell,
          outside ? classes.outside : "",
          isToday ? classes.today : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div key={day.toISOString()} className={cellClass} role="gridcell">
            <button
              type="button"
              className={classes.dayBtn}
              onClick={() => onOpenDay(day)}
              aria-label={day.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            >
              {day.getDate()}
            </button>
            <div className={classes.events}>
              {visible.map((event) => (
                <CalendarEventChip key={event.id} event={event} />
              ))}
              {overflow > 0 && (
                <button type="button" className={classes.more} onClick={() => onOpenDay(day)}>
                  +{overflow} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
