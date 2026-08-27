import { Hono } from "hono";
import type { DashboardStats } from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import { checkInstanceStatus } from "../servarr/status.js";

/** Placeholder stats until queue/missing endpoints are wired. */
export function createStatsRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/", async (c) => {
    const instances = c.get("instances");
    const statuses = await Promise.all(instances.map((i) => checkInstanceStatus(i)));
    const stats: DashboardStats = {
      queueCount: 0,
      missingCount: 0,
      instancesOnline: statuses.filter((s) => s.online).length,
      instancesTotal: statuses.length,
    };
    return c.json(stats);
  });

  return app;
}
