import { Hono } from "hono";
import {
  RequestListQuerySchema,
  RequestUpdateBodySchema,
  UnifiedRequestListQuerySchema,
} from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import { activityListCache } from "../cache/ttlCache.js";
import {
  approveMediaRequest,
  declineMediaRequest,
  getMediaRequestDetail,
  getMediaRequestPage,
  getRequestCount,
  getSeerrServiceDetail,
  listMediaRequests,
  listSeerrServices,
  listSeerrUsers,
  listUnifiedMediaRequests,
  updateMediaRequest,
} from "../servarr/seerrRequests.js";
import { syncRevisionStore } from "../sync/revisionStore.js";

function invalidateRequestCaches() {
  activityListCache.invalidate("requests:");
  activityListCache.invalidate("stats:pending-requests");
  syncRevisionStore.bump(["requests"]);
}

export function createRequestsRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/unified", async (c) => {
    const parsed = UnifiedRequestListQuerySchema.safeParse({
      take: c.req.query("take") ?? undefined,
      skip: c.req.query("skip") ?? undefined,
      filter: c.req.query("filter") ?? undefined,
      mediaType: c.req.query("mediaType") ?? undefined,
      sort: c.req.query("sort") ?? undefined,
      sortDirection: c.req.query("sortDirection") ?? undefined,
      requestedBy: c.req.query("requestedBy") ?? undefined,
      instanceId: c.req.query("instanceId") ?? undefined,
    });
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid query" }, 400);
    }
    const q = parsed.data;
    const skip = q.skip ?? 0;
    const cacheKey =
      skip === 0 &&
      !q.instanceId &&
      !q.requestedBy &&
      (q.filter == null || q.filter === "all" || q.filter === "pending")
        ? `requests:unified:${q.filter ?? "all"}:${q.mediaType ?? "all"}:${q.take ?? 20}:${q.sort ?? "added"}:${q.sortDirection ?? "desc"}`
        : null;
    try {
      if (cacheKey) {
        const cached = activityListCache.get<unknown>(cacheKey);
        if (cached) return c.json(cached);
      }
      const payload = await listUnifiedMediaRequests(c.get("instances"), q);
      if (cacheKey) activityListCache.set(cacheKey, payload, 30_000);
      return c.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load requests";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/count", async (c) => {
    try {
      const counts = await getRequestCount(c.get("instances"), c.req.param("instanceId"));
      return c.json(counts);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load request counts";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/users", async (c) => {
    try {
      const users = await listSeerrUsers(c.get("instances"), c.req.param("instanceId"));
      return c.json({ users });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load users";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/services/:mediaType", async (c) => {
    const mediaType = c.req.param("mediaType");
    if (mediaType !== "movie" && mediaType !== "tv") {
      return c.json({ error: "mediaType must be movie or tv" }, 400);
    }
    try {
      const servers = await listSeerrServices(
        c.get("instances"),
        c.req.param("instanceId"),
        mediaType,
      );
      return c.json({ servers });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load services";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/services/:mediaType/:serverId", async (c) => {
    const mediaType = c.req.param("mediaType");
    const serverId = Number(c.req.param("serverId"));
    if (mediaType !== "movie" && mediaType !== "tv") {
      return c.json({ error: "mediaType must be movie or tv" }, 400);
    }
    if (!Number.isFinite(serverId)) {
      return c.json({ error: "Invalid server id" }, 400);
    }
    try {
      const detail = await getSeerrServiceDetail(
        c.get("instances"),
        c.req.param("instanceId"),
        mediaType,
        serverId,
      );
      return c.json(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load service detail";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:requestId/page", async (c) => {
    const requestId = Number(c.req.param("requestId"));
    if (!Number.isFinite(requestId)) {
      return c.json({ error: "Invalid request id" }, 400);
    }
    try {
      const page = await getMediaRequestPage(
        c.get("instances"),
        c.req.param("instanceId"),
        requestId,
      );
      return c.json(page);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load request page";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:requestId", async (c) => {
    const requestId = Number(c.req.param("requestId"));
    if (!Number.isFinite(requestId)) {
      return c.json({ error: "Invalid request id" }, 400);
    }
    try {
      const detail = await getMediaRequestDetail(
        c.get("instances"),
        c.req.param("instanceId"),
        requestId,
      );
      return c.json(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load request";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.put("/:instanceId/:requestId", async (c) => {
    const requestId = Number(c.req.param("requestId"));
    if (!Number.isFinite(requestId)) {
      return c.json({ error: "Invalid request id" }, 400);
    }
    const body = RequestUpdateBodySchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: body.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      const item = await updateMediaRequest(
        c.get("instances"),
        c.req.param("instanceId"),
        requestId,
        body.data,
      );
      invalidateRequestCaches();
      return c.json(item);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update request";
      const status = message.includes("Select at least one")
        ? 400
        : message.includes("not found")
          ? 404
          : 502;
      return c.json({ error: message }, status);
    }
  });

  app.post("/:instanceId/:requestId/approve", async (c) => {
    const requestId = Number(c.req.param("requestId"));
    if (!Number.isFinite(requestId)) {
      return c.json({ error: "Invalid request id" }, 400);
    }
    try {
      await approveMediaRequest(c.get("instances"), c.req.param("instanceId"), requestId);
      invalidateRequestCaches();
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Approve failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:requestId/decline", async (c) => {
    const requestId = Number(c.req.param("requestId"));
    if (!Number.isFinite(requestId)) {
      return c.json({ error: "Invalid request id" }, 400);
    }
    try {
      await declineMediaRequest(c.get("instances"), c.req.param("instanceId"), requestId);
      invalidateRequestCaches();
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Decline failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId", async (c) => {
    const parsed = RequestListQuerySchema.safeParse({
      take: c.req.query("take") ?? undefined,
      skip: c.req.query("skip") ?? undefined,
      filter: c.req.query("filter") ?? undefined,
      mediaType: c.req.query("mediaType") ?? undefined,
      sort: c.req.query("sort") ?? undefined,
      sortDirection: c.req.query("sortDirection") ?? undefined,
      requestedBy: c.req.query("requestedBy") ?? undefined,
    });
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid query" }, 400);
    }
    try {
      const payload = await listMediaRequests(
        c.get("instances"),
        c.req.param("instanceId"),
        parsed.data,
      );
      return c.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load requests";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  return app;
}
