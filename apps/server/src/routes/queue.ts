import { Hono } from "hono";
import {
  QueueGrabRequestSchema,
  QueueManualImportUpdateRequestSchema,
  QueueProtocolSchema,
  QueueRemoveRequestSchema,
  QueueStatusFilterSchema,
} from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import {
  fetchManualImport,
  fetchQueueList,
  fetchQueueStatus,
  fetchUnifiedQueue,
  grabQueueItems,
  postManualImport,
  refreshMonitoredDownloads,
  removeQueueItems,
} from "../servarr/queue.js";

export function createQueueRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/unified", async (c) => {
    const page = Number(c.req.query("page") ?? 1);
    const pageSize = Number(c.req.query("pageSize") ?? 200);
    const includeUnknown = c.req.query("includeUnknown") !== "false";
    const instanceId = c.req.query("instanceId")?.trim() || undefined;
    const protocolRaw = c.req.query("protocol") ?? "all";
    const statusRaw = c.req.query("status") ?? "all";
    const protocol =
      protocolRaw === "all"
        ? "all"
        : QueueProtocolSchema.safeParse(protocolRaw).success
          ? QueueProtocolSchema.parse(protocolRaw)
          : "all";
    const status =
      statusRaw === "all"
        ? "all"
        : QueueStatusFilterSchema.safeParse(statusRaw).success
          ? QueueStatusFilterSchema.parse(statusRaw)
          : "all";
    try {
      const result = await fetchUnifiedQueue(c.get("instances"), {
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 200,
        includeUnknown,
        instanceId,
        protocol,
        status,
      });
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load queue";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/", async (c) => {
    const instanceId = c.req.query("instanceId")?.trim();
    if (!instanceId) return c.json({ error: "instanceId is required" }, 400);
    const page = Number(c.req.query("page") ?? 1);
    const pageSize = Number(c.req.query("pageSize") ?? 50);
    const includeUnknown = c.req.query("includeUnknown") !== "false";
    const protocolRaw = c.req.query("protocol") ?? "all";
    const statusRaw = c.req.query("status") ?? "all";
    const protocol =
      protocolRaw === "all"
        ? "all"
        : QueueProtocolSchema.safeParse(protocolRaw).success
          ? QueueProtocolSchema.parse(protocolRaw)
          : "all";
    const status =
      statusRaw === "all"
        ? "all"
        : QueueStatusFilterSchema.safeParse(statusRaw).success
          ? QueueStatusFilterSchema.parse(statusRaw)
          : "all";
    try {
      const result = await fetchQueueList(c.get("instances"), instanceId, {
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 50,
        includeUnknown,
        protocol,
        status,
      });
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load queue";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/status", async (c) => {
    try {
      const status = await fetchQueueStatus(c.get("instances"), c.req.param("instanceId"));
      return c.json(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load queue status";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/refresh", async (c) => {
    try {
      await refreshMonitoredDownloads(c.get("instances"), c.req.param("instanceId"));
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Refresh failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.delete("/:instanceId/bulk", async (c) => {
    const parsed = QueueRemoveRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid queue remove", details: parsed.error.flatten() }, 400);
    }
    try {
      await removeQueueItems(c.get("instances"), c.req.param("instanceId"), parsed.data);
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Remove failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.delete("/:instanceId/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isFinite(id)) return c.json({ error: "Invalid queue id" }, 400);
    const body = await c.req.json().catch(() => ({}));
    const parsed = QueueRemoveRequestSchema.safeParse({ ...body, ids: [id] });
    if (!parsed.success) {
      return c.json({ error: "Invalid queue remove", details: parsed.error.flatten() }, 400);
    }
    try {
      await removeQueueItems(c.get("instances"), c.req.param("instanceId"), parsed.data);
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Remove failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/grab/bulk", async (c) => {
    const parsed = QueueGrabRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid queue grab", details: parsed.error.flatten() }, 400);
    }
    try {
      await grabQueueItems(c.get("instances"), c.req.param("instanceId"), parsed.data);
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Grab failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:id/grab", async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isFinite(id)) return c.json({ error: "Invalid queue id" }, 400);
    try {
      await grabQueueItems(c.get("instances"), c.req.param("instanceId"), { ids: [id] });
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Grab failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/manualimport", async (c) => {
    const downloadId = c.req.query("downloadId")?.trim();
    const folder = c.req.query("folder")?.trim();
    if (!downloadId && !folder) {
      return c.json({ error: "downloadId or folder is required" }, 400);
    }
    try {
      const files = await fetchManualImport(c.get("instances"), c.req.param("instanceId"), {
        downloadId,
        folder,
      });
      return c.json({ files });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Manual import lookup failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/manualimport", async (c) => {
    const parsed = QueueManualImportUpdateRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid manual import", details: parsed.error.flatten() }, 400);
    }
    try {
      await postManualImport(c.get("instances"), c.req.param("instanceId"), parsed.data.files);
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Manual import failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  return app;
}
