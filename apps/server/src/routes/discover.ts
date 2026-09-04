import { Hono } from "hono";
import { DiscoverListQuerySchema } from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import {
  fetchDiscoverHome,
  fetchDiscoverList,
  fetchDiscoverTitle,
  searchDiscover,
} from "../servarr/seerrDiscover.js";

export function createDiscoverRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/:instanceId/home", async (c) => {
    try {
      const result = await fetchDiscoverHome(c.get("instances"), c.req.param("instanceId"));
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load Discover";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/search", async (c) => {
    const query = c.req.query("query")?.trim() ?? "";
    const page = Number(c.req.query("page") ?? 1);
    try {
      const result = await searchDiscover(
        c.get("instances"),
        c.req.param("instanceId"),
        query,
        Number.isFinite(page) ? page : 1,
      );
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/movies", async (c) => {
    const parsed = DiscoverListQuerySchema.safeParse({
      page: c.req.query("page") ?? 1,
      genre: c.req.query("genre") || undefined,
      studio: c.req.query("studio") || undefined,
      sortBy: c.req.query("sortBy") || undefined,
      upcoming: c.req.query("upcoming") ?? undefined,
    });
    if (!parsed.success) {
      return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
    }
    try {
      const result = await fetchDiscoverList(
        c.get("instances"),
        c.req.param("instanceId"),
        "movie",
        parsed.data,
      );
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load movies";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/tv", async (c) => {
    const parsed = DiscoverListQuerySchema.safeParse({
      page: c.req.query("page") ?? 1,
      genre: c.req.query("genre") || undefined,
      network: c.req.query("network") || undefined,
      sortBy: c.req.query("sortBy") || undefined,
      upcoming: c.req.query("upcoming") ?? undefined,
    });
    if (!parsed.success) {
      return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
    }
    try {
      const result = await fetchDiscoverList(
        c.get("instances"),
        c.req.param("instanceId"),
        "tv",
        parsed.data,
      );
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load shows";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/title/:mediaType/:tmdbId", async (c) => {
    const mediaTypeRaw = c.req.param("mediaType");
    const mediaType = mediaTypeRaw === "tv" ? "tv" : mediaTypeRaw === "movie" ? "movie" : null;
    const tmdbId = Number(c.req.param("tmdbId"));
    if (!mediaType || !Number.isFinite(tmdbId) || tmdbId <= 0) {
      return c.json({ error: "Invalid title params" }, 400);
    }
    try {
      const result = await fetchDiscoverTitle(
        c.get("instances"),
        c.req.param("instanceId"),
        mediaType,
        tmdbId,
      );
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load title";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  return app;
}
