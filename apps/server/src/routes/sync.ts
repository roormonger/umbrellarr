import { Hono } from "hono";
import type { AppVariables } from "../app.js";
import { syncRevisionStore } from "../sync/revisionStore.js";

export function createSyncRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/revision", (c) => c.json(syncRevisionStore.get()));

  return app;
}
