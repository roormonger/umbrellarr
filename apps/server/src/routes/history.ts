import { Hono } from "hono";
import {
  HistoryEventTypeSchema,
  HistoryProtocolFilterSchema,
} from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import { activityListCache } from "../cache/ttlCache.js";
import {
  deleteHistoryItem,
  fetchUnifiedHistory,
} from "../servarr/history.js";
import { syncRevisionStore } from "../sync/revisionStore.js";

export function createHistoryRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/unified", async (c) => {
    const page = Number(c.req.query("page") ?? 1);
    const pageSize = Number(c.req.query("pageSize") ?? 50);
    const instanceId = c.req.query("instanceId")?.trim() || undefined;
    const eventTypeRaw = c.req.query("eventType") ?? "all";
    const protocolRaw = c.req.query("protocol") ?? "all";
    const eventType =
      eventTypeRaw === "all"
        ? "all"
        : HistoryEventTypeSchema.safeParse(eventTypeRaw).success
          ? HistoryEventTypeSchema.parse(eventTypeRaw)
          : "all";
    const protocol =
      protocolRaw === "all"
        ? "all"
        : HistoryProtocolFilterSchema.safeParse(protocolRaw).success
          ? HistoryProtocolFilterSchema.parse(protocolRaw)
          : "all";
    const resolvedPage = Number.isFinite(page) ? page : 1;
    const resolvedPageSize = Number.isFinite(pageSize) ? pageSize : 50;
    const cacheKey =
      resolvedPage === 1 && !instanceId && eventType === "all" && protocol === "all"
        ? `history:unified:p1:${resolvedPageSize}`
        : null;
    try {
      if (cacheKey) {
        const cached = activityListCache.get<unknown>(cacheKey);
        if (cached) return c.json(cached);
      }
      const result = await fetchUnifiedHistory(c.get("instances"), {
        page: resolvedPage,
        pageSize: resolvedPageSize,
        instanceId,
        eventType,
        protocol,
      });
      if (cacheKey) activityListCache.set(cacheKey, result, 45_000);
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load history";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.delete("/:instanceId/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isFinite(id)) return c.json({ error: "Invalid history id" }, 400);
    try {
      await deleteHistoryItem(c.get("instances"), c.req.param("instanceId"), id);
      activityListCache.invalidate("history:");
      activityListCache.invalidate("stats:history");
      syncRevisionStore.bump(["history"]);
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  return app;
}
