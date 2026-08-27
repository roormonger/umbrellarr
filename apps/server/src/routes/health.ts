import { Hono } from "hono";
import type { AppVariables } from "../app.js";

export function createHealthRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/", (c) =>
    c.json({
      ok: true,
      instancesConfigured: c.get("instances").length,
    }),
  );

  return app;
}
