import { Hono } from "hono";
import { ArtistUpdateRequestSchema } from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import {
  buildArtistLinks,
  deleteArtist,
  fetchArtistDetail,
  fetchArtistEditOptions,
  refreshArtist,
  updateArtist,
} from "../servarr/artistActions.js";

export function createArtistsRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/", async (c) => {
    const instanceId = c.req.query("instanceId")?.trim();
    const all = c.get("instances");
    const scoped = instanceId ? all.filter((i) => i.id === instanceId) : all;
    if (instanceId && scoped.length === 0) {
      return c.json({ error: `Instance ${instanceId} not found` }, 404);
    }
    if (instanceId && scoped[0] && scoped[0].kind !== "lidarr") {
      return c.json({ error: `Instance ${instanceId} is not a Lidarr client` }, 400);
    }
    const force = c.req.query("refresh") === "true";
    const result = await c.get("libraryCache").getArtists(scoped, { force });
    c.header("X-Cache", result.status);
    if (result.fetchedAt) {
      c.header("X-Cache-Fetched-At", result.fetchedAt);
    }
    return c.json({
      artists: result.artists,
      count: result.artists.length,
      cache: result.status,
      fetchedAt: result.fetchedAt,
    });
  });

  app.get("/:instanceId/options", async (c) => {
    try {
      const options = await fetchArtistEditOptions(c.get("instances"), c.req.param("instanceId"));
      return c.json(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load options";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:artistId/links", async (c) => {
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      const links = await buildArtistLinks(
        c.get("instances"),
        c.req.param("instanceId"),
        artistId,
      );
      return c.json({ links });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load links";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:artistId/refresh", async (c) => {
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      const instanceId = c.req.param("instanceId");
      await refreshArtist(c.get("instances"), instanceId, artistId);
      c.get("libraryCache").invalidate(instanceId);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Refresh failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.put("/:instanceId/:artistId", async (c) => {
    const parsed = ArtistUpdateRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      const instanceId = c.req.param("instanceId");
      const detail = await updateArtist(
        c.get("instances"),
        instanceId,
        artistId,
        parsed.data,
      );
      c.get("libraryCache").invalidate(instanceId);
      return c.json(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.delete("/:instanceId/:artistId", async (c) => {
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      const instanceId = c.req.param("instanceId");
      const deleteFiles = c.req.query("deleteFiles") === "true";
      await deleteArtist(c.get("instances"), instanceId, artistId, deleteFiles);
      c.get("libraryCache").invalidate(instanceId);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:artistId", async (c) => {
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      const detail = await fetchArtistDetail(
        c.get("instances"),
        c.req.param("instanceId"),
        artistId,
      );
      return c.json(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load artist";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  return app;
}
