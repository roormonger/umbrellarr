import { Hono } from "hono";
import {
  MovieFileBulkDeleteRequestSchema,
  MovieFileBulkUpdateRequestSchema,
  MovieOrganizeRequestSchema,
  MovieReleaseGrabRequestSchema,
  MovieUpdateRequestSchema,
} from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import {
  buildMovieLinks,
  bulkDeleteMovieFiles,
  bulkUpdateMovieFiles,
  deleteMovie,
  fetchMovieBlocklist,
  fetchMovieDetail,
  fetchMovieEditOptions,
  fetchMovieHistory,
  fetchMovieIndexerFlags,
  fetchMovieLanguages,
  fetchMovieManageFiles,
  fetchMovieNamingConfig,
  fetchMovieQualities,
  fetchMovieRenamePreview,
  fetchMovieReleases,
  grabMovieRelease,
  markMovieHistoryFailed,
  organizeMovieFiles,
  refreshMovie,
  searchMovie,
  updateMovie,
} from "../servarr/movieActions.js";

export function createMoviesRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/", async (c) => {
    const instanceId = c.req.query("instanceId")?.trim();
    const all = c.get("instances");
    const scoped = instanceId ? all.filter((i) => i.id === instanceId) : all;
    if (instanceId && scoped.length === 0) {
      return c.json({ error: `Instance ${instanceId} not found` }, 404);
    }
    const force = c.req.query("refresh") === "true";
    const result = await c.get("libraryCache").getMovies(scoped, { force });
    c.header("X-Cache", result.status);
    if (result.fetchedAt) {
      c.header("X-Cache-Fetched-At", result.fetchedAt);
    }
    return c.json({
      movies: result.movies,
      count: result.movies.length,
      cache: result.status,
      fetchedAt: result.fetchedAt,
    });
  });

  app.get("/:instanceId/options", async (c) => {
    try {
      const options = await fetchMovieEditOptions(c.get("instances"), c.req.param("instanceId"));
      return c.json(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load options";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/naming", async (c) => {
    try {
      const naming = await fetchMovieNamingConfig(c.get("instances"), c.req.param("instanceId"));
      return c.json(naming);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load naming config";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/qualities", async (c) => {
    try {
      const qualities = await fetchMovieQualities(c.get("instances"), c.req.param("instanceId"));
      return c.json({ qualities });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load qualities";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/languages", async (c) => {
    try {
      const languages = await fetchMovieLanguages(c.get("instances"), c.req.param("instanceId"));
      return c.json({ languages });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load languages";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/indexer-flags", async (c) => {
    try {
      const flags = await fetchMovieIndexerFlags(c.get("instances"), c.req.param("instanceId"));
      return c.json({ flags });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load indexer flags";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.put("/:instanceId/files/bulk", async (c) => {
    const parsed = MovieFileBulkUpdateRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid bulk update", details: parsed.error.flatten() }, 400);
    }
    try {
      await bulkUpdateMovieFiles(c.get("instances"), c.req.param("instanceId"), parsed.data.files);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bulk update failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.delete("/:instanceId/files/bulk", async (c) => {
    const parsed = MovieFileBulkDeleteRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid bulk delete", details: parsed.error.flatten() }, 400);
    }
    try {
      await bulkDeleteMovieFiles(
        c.get("instances"),
        c.req.param("instanceId"),
        parsed.data.movieFileIds,
      );
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bulk delete failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:movieId", async (c) => {
    const movieId = Number(c.req.param("movieId"));
    if (!Number.isFinite(movieId)) return c.json({ error: "Invalid movie id" }, 400);
    try {
      const detail = await fetchMovieDetail(
        c.get("instances"),
        c.req.param("instanceId"),
        movieId,
      );
      return c.json(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load movie";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  // Radarr has no links endpoint — we fetch the movie and mirror Radarr's MovieDetailsLinks UI.
  app.get("/:instanceId/:movieId/links", async (c) => {
    const movieId = Number(c.req.param("movieId"));
    if (!Number.isFinite(movieId)) return c.json({ error: "Invalid movie id" }, 400);
    try {
      const detail = await fetchMovieDetail(
        c.get("instances"),
        c.req.param("instanceId"),
        movieId,
      );
      return c.json({ links: buildMovieLinks(detail) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load links";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:movieId/refresh", async (c) => {
    const movieId = Number(c.req.param("movieId"));
    if (!Number.isFinite(movieId)) return c.json({ error: "Invalid movie id" }, 400);
    const instanceId = c.req.param("instanceId");
    try {
      await refreshMovie(c.get("instances"), instanceId, movieId);
      // Metadata may change — refresh this instance snapshot in the background.
      const instance = c.get("instances").find((i) => i.id === instanceId);
      if (instance) {
        void c.get("libraryCache").refresh(instance).catch(() => undefined);
      }
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Refresh failed";
      return c.json({ error: message }, 502);
    }
  });

  app.post("/:instanceId/:movieId/search", async (c) => {
    const movieId = Number(c.req.param("movieId"));
    if (!Number.isFinite(movieId)) return c.json({ error: "Invalid movie id" }, 400);
    try {
      await searchMovie(c.get("instances"), c.req.param("instanceId"), movieId);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      return c.json({ error: message }, 502);
    }
  });

  app.get("/:instanceId/:movieId/history", async (c) => {
    const movieId = Number(c.req.param("movieId"));
    if (!Number.isFinite(movieId)) return c.json({ error: "Invalid movie id" }, 400);
    try {
      const events = await fetchMovieHistory(
        c.get("instances"),
        c.req.param("instanceId"),
        movieId,
      );
      return c.json({ events });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load history";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/history/:historyId/failed", async (c) => {
    const historyId = Number(c.req.param("historyId"));
    if (!Number.isFinite(historyId)) return c.json({ error: "Invalid history id" }, 400);
    try {
      await markMovieHistoryFailed(
        c.get("instances"),
        c.req.param("instanceId"),
        historyId,
      );
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mark as failed failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:movieId/releases", async (c) => {
    const movieId = Number(c.req.param("movieId"));
    if (!Number.isFinite(movieId)) return c.json({ error: "Invalid movie id" }, 400);
    try {
      const releases = await fetchMovieReleases(
        c.get("instances"),
        c.req.param("instanceId"),
        movieId,
      );
      return c.json({ releases });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Interactive search failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:movieId/blocklist", async (c) => {
    const movieId = Number(c.req.param("movieId"));
    if (!Number.isFinite(movieId)) return c.json({ error: "Invalid movie id" }, 400);
    try {
      const items = await fetchMovieBlocklist(
        c.get("instances"),
        c.req.param("instanceId"),
        movieId,
      );
      return c.json({ items });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load blocklist";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/releases/grab", async (c) => {
    const parsed = MovieReleaseGrabRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid grab request", details: parsed.error.flatten() }, 400);
    }
    try {
      await grabMovieRelease(c.get("instances"), c.req.param("instanceId"), parsed.data);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Grab failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:movieId/files", async (c) => {
    const movieId = Number(c.req.param("movieId"));
    if (!Number.isFinite(movieId)) return c.json({ error: "Invalid movie id" }, 400);
    try {
      const files = await fetchMovieManageFiles(
        c.get("instances"),
        c.req.param("instanceId"),
        movieId,
      );
      return c.json({ files });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load movie files";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:movieId/rename", async (c) => {
    const movieId = Number(c.req.param("movieId"));
    if (!Number.isFinite(movieId)) return c.json({ error: "Invalid movie id" }, 400);
    try {
      const items = await fetchMovieRenamePreview(
        c.get("instances"),
        c.req.param("instanceId"),
        movieId,
      );
      return c.json({ items });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load rename preview";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:movieId/organize", async (c) => {
    const movieId = Number(c.req.param("movieId"));
    if (!Number.isFinite(movieId)) return c.json({ error: "Invalid movie id" }, 400);
    const parsed = MovieOrganizeRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid organize request", details: parsed.error.flatten() }, 400);
    }
    try {
      await organizeMovieFiles(
        c.get("instances"),
        c.req.param("instanceId"),
        movieId,
        parsed.data.files,
      );
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Organize failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.put("/:instanceId/:movieId", async (c) => {
    const movieId = Number(c.req.param("movieId"));
    if (!Number.isFinite(movieId)) return c.json({ error: "Invalid movie id" }, 400);
    const parsed = MovieUpdateRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid movie update", details: parsed.error.flatten() }, 400);
    }
    const instanceId = c.req.param("instanceId");
    try {
      const detail = await updateMovie(c.get("instances"), instanceId, movieId, parsed.data);
      const instance = c.get("instances").find((i) => i.id === instanceId);
      if (instance) {
        await c.get("libraryCache").refresh(instance);
      }
      return c.json(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      return c.json({ error: message }, 502);
    }
  });

  app.delete("/:instanceId/:movieId", async (c) => {
    const movieId = Number(c.req.param("movieId"));
    if (!Number.isFinite(movieId)) return c.json({ error: "Invalid movie id" }, 400);
    const deleteFiles = c.req.query("deleteFiles") === "true";
    const instanceId = c.req.param("instanceId");
    try {
      await deleteMovie(c.get("instances"), instanceId, movieId, deleteFiles);
      const instance = c.get("instances").find((i) => i.id === instanceId);
      if (instance) {
        await c.get("libraryCache").refresh(instance);
      }
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      return c.json({ error: message }, 502);
    }
  });

  return app;
}
