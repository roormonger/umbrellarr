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

  return app;
}
