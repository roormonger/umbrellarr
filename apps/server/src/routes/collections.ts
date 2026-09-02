import { Hono } from "hono";
import { CollectionBulkUpdateRequestSchema } from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import {
  bulkUpdateCollections,
  fetchCollectionEditOptions,
  fetchCollections,
  refreshCollections,
} from "../servarr/collections.js";

function tmdbMovieIdMap(
  movies: Array<{ tmdbId?: number; externalId: number }>,
): Map<number, number> {
  const map = new Map<number, number>();
  for (const movie of movies) {
    if (movie.tmdbId != null) map.set(movie.tmdbId, movie.externalId);
  }
  return map;
}

export function createCollectionsRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/", async (c) => {
    const instanceId = c.req.query("instanceId")?.trim();
    if (!instanceId) {
      return c.json({ error: "instanceId is required" }, 400);
    }
    const instances = c.get("instances");
    if (!instances.some((i) => i.id === instanceId && i.kind === "radarr")) {
      return c.json({ error: `Radarr instance not found: ${instanceId}` }, 404);
    }
    try {
      const library = await c.get("libraryCache").getMovies(
        instances.filter((i) => i.id === instanceId),
      );
      const collections = await fetchCollections(
        instances,
        instanceId,
        tmdbMovieIdMap(library.movies),
      );
      return c.json({ collections, count: collections.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load collections";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/options", async (c) => {
    try {
      const options = await fetchCollectionEditOptions(
        c.get("instances"),
        c.req.param("instanceId"),
      );
      return c.json(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load options";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/refresh", async (c) => {
    try {
      await refreshCollections(c.get("instances"), c.req.param("instanceId"));
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Refresh failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.put("/:instanceId", async (c) => {
    const parsed = CollectionBulkUpdateRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid collection update", details: parsed.error.flatten() }, 400);
    }
    try {
      await bulkUpdateCollections(c.get("instances"), c.req.param("instanceId"), parsed.data);
      return c.json({ ok: true as const });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  return app;
}
