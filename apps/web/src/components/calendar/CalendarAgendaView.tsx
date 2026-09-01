import type { CalendarEvent } from "@umbrellarr/shared";
import { eventFallsOnDay, formatAgendaDate, sameDay } from "@/lib/calendarDates";
import { CalendarEventChip } from "./CalendarEventChip";
import classes from "./CalendarAgendaView.module.css";

export function CalendarAgendaView({
  days,
  events,
  onOpenDay,
}: {
  days: Date[];
  events: CalendarEvent[];
  onOpenDay: (day: Date) => void;
}) {
  const today = new Date();

  return (
    <div className={classes.list} data-calendar-view="agenda">
      {days.map((day) => {
        const dayEvents = events.filter((event) => eventFallsOnDay(event.start, event.allDay, day));
        const isToday = sameDay(day, today);
        return (
          <section
            key={day.toISOString()}
            className={`${classes.day} ${isToday ? classes.today : ""}`}
          >
            <div className={classes.heading}>
              <button type="button" className={classes.dateBtn} onClick={() => onOpenDay(day)}>
                {formatAgendaDate(day)}
              </button>
              <span className={classes.count}>
                {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
              </span>
            </div>
            {dayEvents.length === 0 ? (
              <span className={classes.empty}>No events</span>
            ) : (
              <div className={classes.events}>
                {dayEvents.map((event) => (
                  <CalendarEventChip key={event.id} event={event} expanded />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
