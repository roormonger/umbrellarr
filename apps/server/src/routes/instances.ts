import { Hono } from "hono";
import type { InstanceStatus } from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import { checkInstanceStatus } from "../servarr/status.js";

export function createInstancesRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/", (c) => {
    const instances = c.get("instances").map(({ apiKey: _apiKey, ...pub }) => pub);
    return c.json({ instances });
  });

  app.get("/status", async (c) => {
    const instances = c.get("instances");
    const statuses: InstanceStatus[] = await Promise.all(
      instances.map((instance) => checkInstanceStatus(instance)),
    );
    return c.json({ statuses });
  });

  return app;
}
