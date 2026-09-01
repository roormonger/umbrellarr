import type { CalendarView } from "@umbrellarr/shared";

export function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeekSunday(d: Date): Date {
  const next = startOfDay(d);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

export function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** Visible month grid: weeks spanning the calendar month (Sun–Sat). */
export function monthGridRange(anchor: Date): { start: Date; end: Date; days: Date[] } {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeekSunday(monthStart);
  let gridEnd = startOfWeekSunday(monthEnd);
  gridEnd = addDays(gridEnd, 6);
  gridEnd = endOfDay(gridEnd);

  const days: Date[] = [];
  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    days.push(startOfDay(cursor));
  }
  return { start: gridStart, end: gridEnd, days };
}

export function weekRange(anchor: Date): { start: Date; end: Date; days: Date[] } {
  const start = startOfWeekSunday(anchor);
  const end = endOfDay(addDays(start, 6));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return { start, end, days };
}

export function dayRange(anchor: Date): { start: Date; end: Date; days: Date[] } {
  const start = startOfDay(anchor);
  const end = endOfDay(anchor);
  return { start, end, days: [start] };
}

export function forecastRange(anchor: Date, days = 14): { start: Date; end: Date; days: Date[] } {
  const start = startOfDay(anchor);
  const end = endOfDay(addDays(start, days - 1));
  const list = Array.from({ length: days }, (_, i) => addDays(start, i));
  return { start, end, days: list };
}

export function agendaRange(anchor: Date): { start: Date; end: Date; days: Date[] } {
  // Match Arr agenda window roughly: from week containing anchor through ~5 weeks.
  const start = startOfWeekSunday(anchor);
  const end = endOfDay(addDays(start, 34));
  const days: Date[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(startOfDay(cursor));
  }
  return { start, end, days };
}

export function rangeForView(
  view: CalendarView,
  anchor: Date,
): { start: Date; end: Date; days: Date[] } {
  switch (view) {
    case "week":
      return weekRange(anchor);
    case "day":
      return dayRange(anchor);
    case "forecast":
      return forecastRange(anchor);
    case "agenda":
      return agendaRange(anchor);
    case "month":
    default:
      return monthGridRange(anchor);
  }
}

export function shiftAnchor(view: CalendarView, anchor: Date, direction: -1 | 1): Date {
  const next = new Date(anchor);
  switch (view) {
    case "week":
    case "agenda":
      next.setDate(next.getDate() + direction * 7);
      break;
    case "day":
    case "forecast":
      next.setDate(next.getDate() + direction * (view === "forecast" ? 14 : 1));
      break;
    case "month":
    default:
      next.setMonth(next.getMonth() + direction);
      break;
  }
  return next;
}

export function formatMonthTitle(anchor: Date): string {
  return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatRangeTitle(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const left = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
  const right = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${left} – ${right}`;
}

export function formatAgendaDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEventTime(iso: string, allDay: boolean): string {
  if (allDay) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatTimeRange(startIso: string, endIso: string | undefined, allDay: boolean): string {
  if (allDay) return "";
  const start = formatEventTime(startIso, false);
  if (!endIso) return start;
  const end = formatEventTime(endIso, false);
  return `${start} - ${end}`;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** All-day Arr dates use the stored calendar day so midnight UTC does not shift locally. */
export function eventDayKey(iso: string, allDay: boolean): string {
  if (allDay) return iso.slice(0, 10);
  return localDayKey(new Date(iso));
}

export function eventFallsOnDay(eventStartIso: string, allDay: boolean, day: Date): boolean {
  return eventDayKey(eventStartIso, allDay) === localDayKey(day);
}

export function toQueryIso(d: Date): string {
  return d.toISOString();
}
