import { Hono } from "hono";
import { AppearanceUpdateRequestSchema } from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";

export function createSettingsRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/appearance", (c) => {
    return c.json(c.get("appearanceStore").get());
  });

  app.put("/appearance", async (c) => {
    const body = AppearanceUpdateRequestSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: body.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    const settings = c.get("appearanceStore").set(body.data.highlightColor);
    return c.json(settings);
  });

  app.get("/calendar", (c) => {
    return c.json(c.get("calendarFeedStore").getSettings());
  });

  app.post("/calendar/token", (c) => {
    c.get("calendarFeedStore").regenerate();
    return c.json(c.get("calendarFeedStore").getSettings());
  });

  /** Ensure a token exists (first visit from Calendar iCal Link). */
  app.post("/calendar/token/ensure", (c) => {
    c.get("calendarFeedStore").ensureToken();
    return c.json(c.get("calendarFeedStore").getSettings());
  });

  return app;
}
