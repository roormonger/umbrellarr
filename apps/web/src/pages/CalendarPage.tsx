import { Alert, Skeleton, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarViewSchema,
  type CalendarView,
} from "@umbrellarr/shared";
import { useMemo, useState } from "react";
import { getCalendar } from "@/api/calendar";
import { CalendarAgendaView } from "@/components/calendar/CalendarAgendaView";
import { CalendarColumnView } from "@/components/calendar/CalendarColumnView";
import { CalendarIcalModal } from "@/components/calendar/CalendarIcalModal";
import { CalendarLegend } from "@/components/calendar/CalendarLegend";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarToolbar } from "@/components/calendar/CalendarToolbar";
import { usePageHeader } from "@/layout/pageHeader";
import {
  formatMonthTitle,
  formatRangeTitle,
  rangeForView,
  shiftAnchor,
  toQueryIso,
} from "@/lib/calendarDates";
import classes from "./CalendarPage.module.css";

const VIEW_STORAGE = "umbrellarr.calendar.view";

function readStoredView(): CalendarView {
  const parsed = CalendarViewSchema.safeParse(localStorage.getItem(VIEW_STORAGE));
  return parsed.success ? parsed.data : "month";
}

export function CalendarPage() {
  const [view, setView] = useState<CalendarView>(readStoredView);
  const [anchor, setAnchor] = useState(() => new Date());
  const [icalOpen, setIcalOpen] = useState(false);

  const range = useMemo(() => rangeForView(view, anchor), [view, anchor]);
  const calendarQuery = useQuery({
    queryKey: ["calendar", toQueryIso(range.start), toQueryIso(range.end)],
    queryFn: () => getCalendar(toQueryIso(range.start), toQueryIso(range.end)),
  });

  const events = calendarQuery.data?.events ?? [];
  const errors = calendarQuery.data?.errors ?? [];
  usePageHeader("Calendar", calendarQuery.data ? String(events.length) : null);

  const title =
    view === "month"
      ? formatMonthTitle(anchor)
      : view === "day"
        ? range.start.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : formatRangeTitle(range.start, range.end);

  function changeView(next: CalendarView) {
    setView(next);
    localStorage.setItem(VIEW_STORAGE, next);
  }

  function openDay(day: Date) {
    setAnchor(day);
    changeView("day");
  }

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <CalendarToolbar
          title={title}
          view={view}
          onViewChange={changeView}
          onToday={() => setAnchor(new Date())}
          onPrev={() => setAnchor((current) => shiftAnchor(view, current, -1))}
          onNext={() => setAnchor((current) => shiftAnchor(view, current, 1))}
          onIcal={() => setIcalOpen(true)}
        />
      </div>

      {errors.length > 0 && (
        <Alert color="orange" title="Some calendars could not be loaded">
          <Stack gap={4}>
            {errors.map((error) => (
              <Text key={error.instanceId} size="sm">
                {error.instanceName}: {error.message}
              </Text>
            ))}
          </Stack>
        </Alert>
      )}

      {calendarQuery.isError && (
        <Alert color="red" title="Calendar failed to load">
          {calendarQuery.error instanceof Error
            ? calendarQuery.error.message
            : "Unknown error"}
        </Alert>
      )}

      <div className={classes.body}>
        {calendarQuery.isLoading ? (
          <Skeleton height="100%" radius="md" />
        ) : view === "month" ? (
          <CalendarMonthView
            days={range.days}
            events={events}
            anchor={anchor}
            onOpenDay={openDay}
          />
        ) : view === "agenda" ? (
          <CalendarAgendaView days={range.days} events={events} onOpenDay={openDay} />
        ) : (
          <CalendarColumnView
            days={range.days}
            events={events}
            onOpenDay={view === "day" ? undefined : openDay}
          />
        )}
      </div>

      <div className={classes.footer}>
        <CalendarLegend />
      </div>

      <CalendarIcalModal opened={icalOpen} onClose={() => setIcalOpen(false)} />
    </div>
  );
}
