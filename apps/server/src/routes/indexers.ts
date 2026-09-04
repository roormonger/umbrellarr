import { Hono } from "hono";
import {
  IndexerCreateRequestSchema,
  IndexerUpdateRequestSchema,
} from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import { activityListCache } from "../cache/ttlCache.js";
import {
  createIndexer,
  deleteIndexer,
  fetchIndexerEditDetail,
  fetchIndexerEditOptions,
  fetchIndexerRss,
  fetchIndexerSchemaCategories,
  fetchIndexerSchemaList,
  fetchIndexerSchemaTemplate,
  fetchUnifiedIndexers,
  IndexerUpstreamError,
  testIndexer,
  testIndexerCreate,
  updateIndexer,
} from "../servarr/indexers.js";
import { syncRevisionStore } from "../sync/revisionStore.js";

function invalidateIndexerCaches() {
  activityListCache.invalidate("indexers:");
  activityListCache.invalidate("stats:indexers");
  syncRevisionStore.bump(["indexers"]);
}

function indexerErrorStatus(error: unknown): 400 | 404 | 502 {
  if (error instanceof IndexerUpstreamError) {
    if (error.status === 400) return 400;
    if (error.status === 404) return 404;
    return 502;
  }
  const message = error instanceof Error ? error.message : "";
  if (message.includes("not found")) return 404;
  return 502;
}

function parseIndexerId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export function createIndexersRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/unified", async (c) => {
    const instanceId = c.req.query("instanceId")?.trim() || undefined;
    const cacheKey = `indexers:unified:${instanceId ?? "all"}`;
    try {
      const cached = activityListCache.get<unknown>(cacheKey);
      if (cached) return c.json(cached);
      const result = await fetchUnifiedIndexers(c.get("instances"), instanceId);
      activityListCache.set(cacheKey, result, 45_000);
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load indexers";
      return c.json({ error: message }, indexerErrorStatus(error));
    }
  });

  app.get("/:instanceId/options", async (c) => {
    try {
      const result = await fetchIndexerEditOptions(c.get("instances"), c.req.param("instanceId"));
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load indexer options";
      return c.json({ error: message }, indexerErrorStatus(error));
    }
  });

  app.get("/:instanceId/schema/template", async (c) => {
    const key = c.req.query("key")?.trim();
    if (!key) return c.json({ error: "Missing schema key" }, 400);
    try {
      const result = await fetchIndexerSchemaTemplate(
        c.get("instances"),
        c.req.param("instanceId"),
        key,
      );
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load schema template";
      return c.json({ error: message }, indexerErrorStatus(error));
    }
  });

  app.get("/:instanceId/schema", async (c) => {
    try {
      const result = await fetchIndexerSchemaList(c.get("instances"), c.req.param("instanceId"));
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load indexer schema";
      return c.json({ error: message }, indexerErrorStatus(error));
    }
  });

  app.get("/:instanceId/categories", async (c) => {
    try {
      const result = await fetchIndexerSchemaCategories(
        c.get("instances"),
        c.req.param("instanceId"),
      );
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load categories";
      return c.json({ error: message }, indexerErrorStatus(error));
    }
  });

  app.post("/:instanceId/test", async (c) => {
    const parsed = IndexerCreateRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid indexer test", details: parsed.error.flatten() }, 400);
    }
    const forceTest = c.req.query("forceTest") === "true";
    try {
      await testIndexerCreate(
        c.get("instances"),
        c.req.param("instanceId"),
        parsed.data,
        forceTest,
      );
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test failed";
      return c.json({ error: message }, indexerErrorStatus(error));
    }
  });

  app.post("/:instanceId", async (c) => {
    const parsed = IndexerCreateRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid indexer create", details: parsed.error.flatten() }, 400);
    }
    const forceSave = c.req.query("forceSave") === "true";
    try {
      await createIndexer(c.get("instances"), c.req.param("instanceId"), parsed.data, forceSave);
      invalidateIndexerCaches();
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Create failed";
      return c.json({ error: message }, indexerErrorStatus(error));
    }
  });

  app.get("/:instanceId/:id/rss", async (c) => {
    const id = parseIndexerId(c.req.param("id"));
    if (id == null) return c.json({ error: "Invalid indexer id" }, 400);
    try {
      const upstream = await fetchIndexerRss(c.get("instances"), c.req.param("instanceId"), id);
      const contentType =
        upstream.headers.get("content-type") ?? "application/rss+xml; charset=utf-8";
      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "RSS proxy failed";
      return c.json({ error: message }, indexerErrorStatus(error));
    }
  });

  app.post("/:instanceId/:id/test", async (c) => {
    const id = parseIndexerId(c.req.param("id"));
    if (id == null) return c.json({ error: "Invalid indexer id" }, 400);
    const parsed = IndexerUpdateRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid indexer test", details: parsed.error.flatten() }, 400);
    }
    const forceTest = c.req.query("forceTest") === "true";
    try {
      await testIndexer(c.get("instances"), c.req.param("instanceId"), id, parsed.data, forceTest);
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test failed";
      return c.json({ error: message }, indexerErrorStatus(error));
    }
  });

  app.get("/:instanceId/:id", async (c) => {
    const id = parseIndexerId(c.req.param("id"));
    if (id == null) return c.json({ error: "Invalid indexer id" }, 400);
    try {
      const result = await fetchIndexerEditDetail(
        c.get("instances"),
        c.req.param("instanceId"),
        id,
      );
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load indexer";
      return c.json({ error: message }, indexerErrorStatus(error));
    }
  });

  app.put("/:instanceId/:id", async (c) => {
    const id = parseIndexerId(c.req.param("id"));
    if (id == null) return c.json({ error: "Invalid indexer id" }, 400);
    const parsed = IndexerUpdateRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid indexer update", details: parsed.error.flatten() }, 400);
    }
    const forceSave = c.req.query("forceSave") === "true";
    try {
      await updateIndexer(c.get("instances"), c.req.param("instanceId"), id, parsed.data, forceSave);
      invalidateIndexerCaches();
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      return c.json({ error: message }, indexerErrorStatus(error));
    }
  });

  app.delete("/:instanceId/:id", async (c) => {
    const id = parseIndexerId(c.req.param("id"));
    if (id == null) return c.json({ error: "Invalid indexer id" }, 400);
    try {
      await deleteIndexer(c.get("instances"), c.req.param("instanceId"), id);
      invalidateIndexerCaches();
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      return c.json({ error: message }, indexerErrorStatus(error));
    }
  });

  return app;
}
