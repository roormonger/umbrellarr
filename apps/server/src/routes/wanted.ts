import { Hono } from "hono";
import {
  WantedModeSchema,
  WantedSearchRequestSchema,
  WantedUnmonitorRequestSchema,
} from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import { activityListCache } from "../cache/ttlCache.js";
import {
  fetchUnifiedWanted,
  searchWanted,
  searchWantedAll,
  monitorWantedItems,
  unmonitorWantedItems,
} from "../servarr/wanted.js";
import { syncRevisionStore } from "../sync/revisionStore.js";

function invalidateWantedCaches() {
  activityListCache.invalidate("wanted:");
  activityListCache.invalidate("stats:missing-total");
  syncRevisionStore.bump(["wanted"]);
}

export function createWantedRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/unified", async (c) => {
    const page = Number(c.req.query("page") ?? 1);
    const pageSize = Number(c.req.query("pageSize") ?? 50);
    const instanceId = c.req.query("instanceId")?.trim() || undefined;
    const modeRaw = c.req.query("mode") ?? "missing";
    const modeParsed = WantedModeSchema.safeParse(modeRaw);
    const mode = modeParsed.success ? modeParsed.data : "missing";
    const monitored = c.req.query("monitored") !== "false";
    const resolvedPage = Number.isFinite(page) ? page : 1;
    const resolvedPageSize = Number.isFinite(pageSize) ? pageSize : 50;
    const cacheKey =
      resolvedPage === 1 && !instanceId
        ? `wanted:unified:${mode}:${monitored ? "m" : "u"}:p1:${resolvedPageSize}`
        : null;
    try {
      if (cacheKey) {
        const cached = activityListCache.get<unknown>(cacheKey);
        if (cached) return c.json(cached);
      }
      const result = await fetchUnifiedWanted(c.get("instances"), {
        mode,
        page: resolvedPage,
        pageSize: resolvedPageSize,
        instanceId,
        monitored,
      });
      if (cacheKey) activityListCache.set(cacheKey, result, 30_000);
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load wanted";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/search", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = WantedSearchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      await searchWanted(
        c.get("instances"),
        c.req.param("instanceId"),
        parsed.data.mode,
        parsed.data.ids,
      );
      invalidateWantedCaches();
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/search-all", async (c) => {
    const body = await c.req.json().catch(() => null);
    const modeParsed = WantedModeSchema.safeParse(
      body && typeof body === "object" && body !== null && "mode" in body
        ? (body as { mode: unknown }).mode
        : "missing",
    );
    const mode = modeParsed.success ? modeParsed.data : "missing";
    const instanceId =
      body && typeof body === "object" && body !== null && "instanceId" in body
        ? String((body as { instanceId?: unknown }).instanceId ?? "").trim() || undefined
        : undefined;
    try {
      const result = await searchWantedAll(c.get("instances"), mode, instanceId);
      invalidateWantedCaches();
      return c.json({ ok: true as const, errors: result.errors });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search all failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/unmonitor", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = WantedUnmonitorRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      await unmonitorWantedItems(c.get("instances"), parsed.data.items);
      invalidateWantedCaches();
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unmonitor failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/monitor", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = WantedUnmonitorRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      await monitorWantedItems(c.get("instances"), parsed.data.items);
      invalidateWantedCaches();
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Monitor failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  return app;
}
