import { Hono } from "hono";
import {
  SeriesAddRequestSchema,
  SeriesFileBulkDeleteRequestSchema,
  SeriesFileBulkUpdateRequestSchema,
  SeriesOrganizeRequestSchema,
  SeriesReleaseGrabRequestSchema,
  SeriesSeasonMonitorRequestSchema,
  SeriesUpdateRequestSchema,
} from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import { parseLibraryLimit } from "./libraryQuery.js";
import {
  addSeries,
  buildSeriesLinks,
  bulkDeleteSeriesFiles,
  bulkUpdateSeriesFiles,
  deleteSeries,
  fetchSeriesBlocklist,
  fetchSeriesDetail,
  fetchSeriesEditOptions,
  fetchSeriesHistory,
  fetchSeriesIndexerFlags,
  fetchSeriesLanguages,
  fetchSeriesManageFiles,
  fetchSeriesNamingConfig,
  fetchSeriesQualities,
  fetchSeriesRenamePreview,
  fetchSeriesReleases,
  fetchSeriesRatings,
  fetchSeriesTrailer,
  grabSeriesRelease,
  lookupSeries,
  markSeriesHistoryFailed,
  organizeSeriesFiles,
  refreshSeries,
  searchSeries,
  updateSeries,
} from "../servarr/showActions.js";
import {
  fetchEpisodeReleases,
  fetchSeasonReleases,
  fetchSeriesEpisodes,
  fetchSeriesHistoryForSeason,
  fetchSeriesManageFilesForSeason,
  fetchSeriesRenamePreviewForSeason,
  fetchSeriesSeasons,
  searchEpisode,
  searchSeason,
  setSeasonMonitored,
} from "../servarr/seriesSeasons.js";
import { resolveSeriesYouTubeTrailerId } from "../servarr/seriesTrailer.js";

function parseId(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseSeasonNumber(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

export function createShowsRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/", async (c) => {
    const instanceId = c.req.query("instanceId")?.trim();
    const all = c.get("instances");
    const scoped = instanceId ? all.filter((i) => i.id === instanceId) : all;
    if (instanceId && scoped.length === 0) {
      return c.json({ error: `Instance ${instanceId} not found` }, 404);
    }
    if (instanceId && scoped[0] && scoped[0].kind !== "sonarr") {
      return c.json({ error: `Instance ${instanceId} is not a Sonarr client` }, 400);
    }
    const force = c.req.query("refresh") === "true";
    const limit = parseLibraryLimit(c.req.query("limit"));
    const result = await c.get("libraryCache").getSeries(scoped, { force, limit });
    c.header("X-Cache", result.status);
    if (result.fetchedAt) {
      c.header("X-Cache-Fetched-At", result.fetchedAt);
    }
    return c.json({
      series: result.series,
      count: result.series.length,
      total: result.total,
      truncated: result.truncated,
      cache: result.status,
      fetchedAt: result.fetchedAt,
    });
  });

  app.get("/:instanceId/options", async (c) => {
    try {
      const options = await fetchSeriesEditOptions(c.get("instances"), c.req.param("instanceId"));
      return c.json(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load options";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/lookup", async (c) => {
    const term = c.req.query("term")?.trim() ?? "";
    if (!term) return c.json({ results: [] });
    try {
      const results = await lookupSeries(c.get("instances"), c.req.param("instanceId"), term);
      return c.json({ results });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lookup failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId", async (c) => {
    const parsed = SeriesAddRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid series add", details: parsed.error.flatten() }, 400);
    }
    const instanceId = c.req.param("instanceId");
    try {
      const detail = await addSeries(c.get("instances"), instanceId, parsed.data);
      c.get("libraryCache").invalidate(instanceId);
      return c.json(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Add failed";
      const existingId =
        error instanceof Error && "existingId" in error
          ? Number((error as { existingId?: unknown }).existingId)
          : undefined;
      if (message.includes("already in the library")) {
        return c.json(
          { error: message, ...(Number.isFinite(existingId) ? { existingId } : {}) },
          409,
        );
      }
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/naming", async (c) => {
    try {
      const naming = await fetchSeriesNamingConfig(c.get("instances"), c.req.param("instanceId"));
      return c.json(naming);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load naming config";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/qualities", async (c) => {
    try {
      const qualities = await fetchSeriesQualities(c.get("instances"), c.req.param("instanceId"));
      return c.json({ qualities });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load qualities";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/languages", async (c) => {
    try {
      const languages = await fetchSeriesLanguages(c.get("instances"), c.req.param("instanceId"));
      return c.json({ languages });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load languages";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/indexer-flags", async (c) => {
    try {
      const flags = await fetchSeriesIndexerFlags(c.get("instances"), c.req.param("instanceId"));
      return c.json({ flags });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load indexer flags";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.put("/:instanceId/files/bulk", async (c) => {
    const parsed = SeriesFileBulkUpdateRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid bulk update", details: parsed.error.flatten() }, 400);
    }
    try {
      await bulkUpdateSeriesFiles(c.get("instances"), c.req.param("instanceId"), parsed.data.files);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bulk update failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.delete("/:instanceId/files/bulk", async (c) => {
    const parsed = SeriesFileBulkDeleteRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid bulk delete", details: parsed.error.flatten() }, 400);
    }
    try {
      await bulkDeleteSeriesFiles(
        c.get("instances"),
        c.req.param("instanceId"),
        parsed.data.episodeFileIds,
      );
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bulk delete failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/history/:historyId/failed", async (c) => {
    const historyId = Number(c.req.param("historyId"));
    if (!Number.isFinite(historyId)) return c.json({ error: "Invalid history id" }, 400);
    try {
      await markSeriesHistoryFailed(
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

  app.post("/:instanceId/releases/grab", async (c) => {
    const parsed = SeriesReleaseGrabRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid grab request", details: parsed.error.flatten() }, 400);
    }
    try {
      await grabSeriesRelease(c.get("instances"), c.req.param("instanceId"), parsed.data);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Grab failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:seriesId/links", async (c) => {
    try {
      const seriesId = Number(c.req.param("seriesId"));
      if (!Number.isFinite(seriesId)) {
        return c.json({ error: "Invalid series id" }, 400);
      }
      const detail = await fetchSeriesDetail(
        c.get("instances"),
        c.req.param("instanceId"),
        seriesId,
      );
      const youTubeTrailerId = await resolveSeriesYouTubeTrailerId(
        {
          tmdbId: detail.tmdbId,
          imdbId: detail.imdbId,
          tvMazeId: detail.tvMazeId,
        },
        detail.youTubeTrailerId,
      );
      return c.json({
        links: buildSeriesLinks({
          ...detail,
          ...(youTubeTrailerId ? { youTubeTrailerId } : {}),
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load links";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:seriesId/trailer", async (c) => {
    try {
      const seriesId = Number(c.req.param("seriesId"));
      if (!Number.isFinite(seriesId)) {
        return c.json({ error: "Invalid series id" }, 400);
      }
      const result = await fetchSeriesTrailer(
        c.get("instances"),
        c.req.param("instanceId"),
        seriesId,
      );
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load trailer";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:seriesId/ratings", async (c) => {
    try {
      const seriesId = Number(c.req.param("seriesId"));
      if (!Number.isFinite(seriesId)) {
        return c.json({ error: "Invalid series id" }, 400);
      }
      const result = await fetchSeriesRatings(
        c.get("instances"),
        c.req.param("instanceId"),
        seriesId,
      );
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load ratings";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:seriesId/refresh", async (c) => {
    try {
      const seriesId = Number(c.req.param("seriesId"));
      if (!Number.isFinite(seriesId)) {
        return c.json({ error: "Invalid series id" }, 400);
      }
      const instanceId = c.req.param("instanceId");
      await refreshSeries(c.get("instances"), instanceId, seriesId);
      c.get("libraryCache").invalidate(instanceId);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Refresh failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:seriesId/search", async (c) => {
    try {
      const seriesId = Number(c.req.param("seriesId"));
      if (!Number.isFinite(seriesId)) {
        return c.json({ error: "Invalid series id" }, 400);
      }
      await searchSeries(c.get("instances"), c.req.param("instanceId"), seriesId);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:seriesId/seasons", async (c) => {
    const seriesId = parseId(c.req.param("seriesId"));
    if (seriesId == null) return c.json({ error: "Invalid series id" }, 400);
    try {
      const seasons = await fetchSeriesSeasons(
        c.get("instances"),
        c.req.param("instanceId"),
        seriesId,
      );
      return c.json({ seasons });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load seasons";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:seriesId/episodes", async (c) => {
    const seriesId = parseId(c.req.param("seriesId"));
    if (seriesId == null) return c.json({ error: "Invalid series id" }, 400);
    const seasonRaw = c.req.query("seasonNumber");
    const seasonNumber =
      seasonRaw == null || seasonRaw === "" ? undefined : parseSeasonNumber(seasonRaw);
    if (seasonRaw && seasonNumber == null) {
      return c.json({ error: "Invalid season number" }, 400);
    }
    try {
      const episodes = await fetchSeriesEpisodes(
        c.get("instances"),
        c.req.param("instanceId"),
        seriesId,
        seasonNumber ?? undefined,
      );
      return c.json({ episodes });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load episodes";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:seriesId/seasons/:seasonNumber/search", async (c) => {
    const seriesId = parseId(c.req.param("seriesId"));
    const seasonNumber = parseSeasonNumber(c.req.param("seasonNumber"));
    if (seriesId == null) return c.json({ error: "Invalid series id" }, 400);
    if (seasonNumber == null) return c.json({ error: "Invalid season number" }, 400);
    try {
      await searchSeason(c.get("instances"), c.req.param("instanceId"), seriesId, seasonNumber);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Season search failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.put("/:instanceId/:seriesId/seasons/:seasonNumber/monitor", async (c) => {
    const seriesId = parseId(c.req.param("seriesId"));
    const seasonNumber = parseSeasonNumber(c.req.param("seasonNumber"));
    if (seriesId == null) return c.json({ error: "Invalid series id" }, 400);
    if (seasonNumber == null) return c.json({ error: "Invalid season number" }, 400);
    const parsed = SeriesSeasonMonitorRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid monitor request", details: parsed.error.flatten() }, 400);
    }
    try {
      const instanceId = c.req.param("instanceId");
      const seasons = await setSeasonMonitored(
        c.get("instances"),
        instanceId,
        seriesId,
        seasonNumber,
        parsed.data.monitored,
      );
      c.get("libraryCache").invalidate(instanceId);
      return c.json({ seasons });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Season monitor failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:seriesId/seasons/:seasonNumber/releases", async (c) => {
    const seriesId = parseId(c.req.param("seriesId"));
    const seasonNumber = parseSeasonNumber(c.req.param("seasonNumber"));
    if (seriesId == null) return c.json({ error: "Invalid series id" }, 400);
    if (seasonNumber == null) return c.json({ error: "Invalid season number" }, 400);
    try {
      const releases = await fetchSeasonReleases(
        c.get("instances"),
        c.req.param("instanceId"),
        seriesId,
        seasonNumber,
      );
      return c.json({ releases });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Interactive search failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:seriesId/episodes/:episodeId/search", async (c) => {
    const episodeId = parseId(c.req.param("episodeId"));
    if (episodeId == null) return c.json({ error: "Invalid episode id" }, 400);
    try {
      await searchEpisode(c.get("instances"), c.req.param("instanceId"), episodeId);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Episode search failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:seriesId/episodes/:episodeId/releases", async (c) => {
    const episodeId = parseId(c.req.param("episodeId"));
    if (episodeId == null) return c.json({ error: "Invalid episode id" }, 400);
    try {
      const releases = await fetchEpisodeReleases(
        c.get("instances"),
        c.req.param("instanceId"),
        episodeId,
      );
      return c.json({ releases });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Interactive search failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:seriesId/history", async (c) => {
    const seriesId = Number(c.req.param("seriesId"));
    if (!Number.isFinite(seriesId)) return c.json({ error: "Invalid series id" }, 400);
    const seasonRaw = c.req.query("seasonNumber");
    const seasonNumber =
      seasonRaw == null || seasonRaw === "" ? undefined : parseSeasonNumber(seasonRaw);
    if (seasonRaw && seasonNumber == null) {
      return c.json({ error: "Invalid season number" }, 400);
    }
    try {
      const events =
        seasonNumber != null
          ? await fetchSeriesHistoryForSeason(
              c.get("instances"),
              c.req.param("instanceId"),
              seriesId,
              seasonNumber,
            )
          : await fetchSeriesHistory(
              c.get("instances"),
              c.req.param("instanceId"),
              seriesId,
            );
      return c.json({ events });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load history";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:seriesId/releases", async (c) => {
    const seriesId = Number(c.req.param("seriesId"));
    if (!Number.isFinite(seriesId)) return c.json({ error: "Invalid series id" }, 400);
    try {
      const releases = await fetchSeriesReleases(
        c.get("instances"),
        c.req.param("instanceId"),
        seriesId,
      );
      return c.json({ releases });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Interactive search failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:seriesId/blocklist", async (c) => {
    const seriesId = Number(c.req.param("seriesId"));
    if (!Number.isFinite(seriesId)) return c.json({ error: "Invalid series id" }, 400);
    try {
      const items = await fetchSeriesBlocklist(
        c.get("instances"),
        c.req.param("instanceId"),
        seriesId,
      );
      return c.json({ items });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load blocklist";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:seriesId/files", async (c) => {
    const seriesId = Number(c.req.param("seriesId"));
    if (!Number.isFinite(seriesId)) return c.json({ error: "Invalid series id" }, 400);
    const seasonRaw = c.req.query("seasonNumber");
    const seasonNumber =
      seasonRaw == null || seasonRaw === "" ? undefined : parseSeasonNumber(seasonRaw);
    if (seasonRaw && seasonNumber == null) {
      return c.json({ error: "Invalid season number" }, 400);
    }
    try {
      const files =
        seasonNumber != null
          ? await fetchSeriesManageFilesForSeason(
              c.get("instances"),
              c.req.param("instanceId"),
              seriesId,
              seasonNumber,
            )
          : await fetchSeriesManageFiles(
              c.get("instances"),
              c.req.param("instanceId"),
              seriesId,
            );
      return c.json({ files });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load episode files";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:seriesId/rename", async (c) => {
    const seriesId = Number(c.req.param("seriesId"));
    if (!Number.isFinite(seriesId)) return c.json({ error: "Invalid series id" }, 400);
    const seasonRaw = c.req.query("seasonNumber");
    const seasonNumber =
      seasonRaw == null || seasonRaw === "" ? undefined : parseSeasonNumber(seasonRaw);
    if (seasonRaw && seasonNumber == null) {
      return c.json({ error: "Invalid season number" }, 400);
    }
    try {
      const items =
        seasonNumber != null
          ? await fetchSeriesRenamePreviewForSeason(
              c.get("instances"),
              c.req.param("instanceId"),
              seriesId,
              seasonNumber,
            )
          : await fetchSeriesRenamePreview(
              c.get("instances"),
              c.req.param("instanceId"),
              seriesId,
            );
      return c.json({ items });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load rename preview";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:seriesId/organize", async (c) => {
    const seriesId = Number(c.req.param("seriesId"));
    if (!Number.isFinite(seriesId)) return c.json({ error: "Invalid series id" }, 400);
    const parsed = SeriesOrganizeRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "Invalid organize request", details: parsed.error.flatten() }, 400);
    }
    try {
      await organizeSeriesFiles(
        c.get("instances"),
        c.req.param("instanceId"),
        seriesId,
        parsed.data.files,
      );
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Organize failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.put("/:instanceId/:seriesId", async (c) => {
    const parsed = SeriesUpdateRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      const seriesId = Number(c.req.param("seriesId"));
      if (!Number.isFinite(seriesId)) {
        return c.json({ error: "Invalid series id" }, 400);
      }
      const instanceId = c.req.param("instanceId");
      const detail = await updateSeries(c.get("instances"), instanceId, seriesId, parsed.data);
      c.get("libraryCache").invalidate(instanceId);
      return c.json(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.delete("/:instanceId/:seriesId", async (c) => {
    try {
      const seriesId = Number(c.req.param("seriesId"));
      if (!Number.isFinite(seriesId)) {
        return c.json({ error: "Invalid series id" }, 400);
      }
      const instanceId = c.req.param("instanceId");
      const deleteFiles = c.req.query("deleteFiles") === "true";
      await deleteSeries(c.get("instances"), instanceId, seriesId, deleteFiles);
      c.get("libraryCache").invalidate(instanceId);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:seriesId", async (c) => {
    try {
      const seriesId = Number(c.req.param("seriesId"));
      if (!Number.isFinite(seriesId)) {
        return c.json({ error: "Invalid series id" }, 400);
      }
      const detail = await fetchSeriesDetail(
        c.get("instances"),
        c.req.param("instanceId"),
        seriesId,
      );
      return c.json(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load series";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  return app;
}
