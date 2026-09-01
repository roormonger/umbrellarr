import { CALENDAR_STATUS_LEGEND, calendarStatusColor } from "@/lib/calendarStatus";
import classes from "./CalendarLegend.module.css";

export function CalendarLegend() {
  return (
    <div className={classes.legend} aria-label="Calendar status legend">
      {CALENDAR_STATUS_LEGEND.map((item) => (
        <span key={item.status} className={classes.item}>
          <span
            className={classes.swatch}
            style={{ backgroundColor: calendarStatusColor(item.status) }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
