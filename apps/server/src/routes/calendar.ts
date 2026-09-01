import { Hono } from "hono";
import { CalendarQuerySchema } from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import { eventsToIcs, fetchUnifiedCalendar } from "../servarr/calendar.js";

export function createCalendarRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/", async (c) => {
    const parsed = CalendarQuerySchema.safeParse({
      start: c.req.query("start"),
      end: c.req.query("end"),
      unmonitored: c.req.query("unmonitored") ?? "true",
    });
    if (!parsed.success) {
      return c.json({ error: "Invalid calendar query", details: parsed.error.flatten() }, 400);
    }
    const result = await fetchUnifiedCalendar(
      c.get("instances"),
      parsed.data.start,
      parsed.data.end,
      parsed.data.unmonitored,
    );
    return c.json(result);
  });

  return app;
}

/** Public ICS feed — token validated against CalendarFeedStore. */
export function createCalendarIcsRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/calendar.ics", async (c) => {
    const token = c.req.query("token")?.trim();
    if (!c.get("calendarFeedStore").tokenMatches(token)) {
      return c.json({ error: "Invalid or missing calendar feed token" }, 401);
    }

    const pastDays = Math.min(90, Math.max(0, Number(c.req.query("pastDays") ?? 7) || 7));
    const futureDays = Math.min(365, Math.max(1, Number(c.req.query("futureDays") ?? 28) || 28));
    const now = new Date();
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - pastDays);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setUTCDate(end.getUTCDate() + futureDays);
    end.setUTCHours(23, 59, 59, 999);

    const result = await fetchUnifiedCalendar(
      c.get("instances"),
      start.toISOString(),
      end.toISOString(),
      true,
    );
    const body = eventsToIcs(result.events);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="umbrellarr.ics"',
        "Cache-Control": "no-store",
      },
    });
  });

  return app;
}
