import { Hono } from "hono";
import { UnifiedIssueListQuerySchema } from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import { listUnifiedMediaIssues } from "../servarr/seerrIssues.js";

export function createIssuesRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/unified", async (c) => {
    const parsed = UnifiedIssueListQuerySchema.safeParse({
      take: c.req.query("take") ?? undefined,
      skip: c.req.query("skip") ?? undefined,
      filter: c.req.query("filter") ?? undefined,
      sort: c.req.query("sort") ?? undefined,
      sortDirection: c.req.query("sortDirection") ?? undefined,
      instanceId: c.req.query("instanceId") ?? undefined,
    });
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid query" }, 400);
    }
    try {
      const payload = await listUnifiedMediaIssues(c.get("instances"), parsed.data);
      return c.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load issues";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  return app;
}
