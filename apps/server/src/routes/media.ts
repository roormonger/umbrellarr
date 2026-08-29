import { Hono } from "hono";
import type { AppVariables } from "../app.js";
import { arrFetch } from "../servarr/client.js";
import { toGridPosterPath } from "../servarr/mediaCover.js";

/**
 * Proxy *arr MediaCover (and similar) assets so the browser never sees API keys.
 * GET /api/media/:instanceId/image?path=/MediaCover/1/poster-500.jpg
 */
export function createMediaRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/:instanceId/image", async (c) => {
    const instanceId = c.req.param("instanceId");
    const path = c.req.query("path");

    if (!path || !path.startsWith("/") || path.includes("://") || path.includes("..")) {
      return c.json({ error: "Invalid image path" }, 400);
    }

    const instance = c.get("instances").find((i) => i.id === instanceId);
    if (!instance) {
      return c.json({ error: "Instance not found" }, 404);
    }

    try {
      const preferred = toGridPosterPath(path);
      let upstream = await arrFetch(instance, preferred, {
        headers: { Accept: "image/*,*/*" },
        timeoutMs: 20_000,
      });

      if (!upstream.ok && preferred !== path) {
        upstream = await arrFetch(instance, path, {
          headers: { Accept: "image/*,*/*" },
          timeoutMs: 20_000,
        });
      }

      if (!upstream.ok) {
        return c.json({ error: `Upstream HTTP ${upstream.status}` }, 502);
      }

      const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
      const buffer = await upstream.arrayBuffer();

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(buffer.byteLength),
          "Cache-Control": "private, max-age=2592000, stale-while-revalidate=604800",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image proxy failed";
      return c.json({ error: message }, 502);
    }
  });

  return app;
}
