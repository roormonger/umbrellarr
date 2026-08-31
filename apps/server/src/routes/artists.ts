import { Hono } from "hono";
import {
  ArtistAlbumsMonitorRequestSchema,
  ArtistFileBulkDeleteRequestSchema,
  ArtistFileBulkUpdateRequestSchema,
  ArtistMonitoringRequestSchema,
  ArtistOrganizeRequestSchema,
  ArtistReleaseGrabRequestSchema,
  ArtistRetagRequestSchema,
  ArtistUpdateRequestSchema,
} from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import { parseLibraryLimit } from "./libraryQuery.js";
import {
  buildArtistLinks,
  bulkDeleteArtistFiles,
  bulkUpdateArtistFiles,
  deleteArtist,
  fetchArtistBlocklist,
  fetchArtistEditOptions,
  fetchArtistHistory,
  fetchArtistManageFiles,
  fetchArtistNamingConfig,
  fetchArtistPageDetail,
  fetchArtistQualities,
  fetchArtistReleases,
  fetchArtistRenamePreview,
  fetchArtistRetagPreview,
  grabArtistRelease,
  markArtistHistoryFailed,
  organizeArtistFiles,
  refreshArtist,
  retagArtistFiles,
  searchArtist,
  updateArtist,
  updateArtistAlbumMonitoring,
} from "../servarr/artistActions.js";
import { fetchArtistAlbumTracks } from "../servarr/artistAlbumTracks.js";
import {
  fetchArtistAlbums,
  searchAlbum,
  setAlbumsMonitored,
} from "../servarr/artistAlbums.js";

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
    const limit = parseLibraryLimit(c.req.query("limit"));
    const result = await c.get("libraryCache").getArtists(scoped, { force, limit });
    c.header("X-Cache", result.status);
    if (result.fetchedAt) {
      c.header("X-Cache-Fetched-At", result.fetchedAt);
    }
    return c.json({
      artists: result.artists,
      count: result.artists.length,
      total: result.total,
      truncated: result.truncated,
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

  app.get("/:instanceId/naming", async (c) => {
    try {
      const naming = await fetchArtistNamingConfig(c.get("instances"), c.req.param("instanceId"));
      return c.json(naming);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load naming";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/qualities", async (c) => {
    try {
      const qualities = await fetchArtistQualities(c.get("instances"), c.req.param("instanceId"));
      return c.json({ qualities });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load qualities";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.put("/:instanceId/files/bulk", async (c) => {
    const parsed = ArtistFileBulkUpdateRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      await bulkUpdateArtistFiles(c.get("instances"), c.req.param("instanceId"), parsed.data);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bulk update failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.delete("/:instanceId/files/bulk", async (c) => {
    const parsed = ArtistFileBulkDeleteRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      await bulkDeleteArtistFiles(
        c.get("instances"),
        c.req.param("instanceId"),
        parsed.data.trackFileIds,
      );
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bulk delete failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/history/:historyId/failed", async (c) => {
    try {
      const historyId = Number(c.req.param("historyId"));
      if (!Number.isFinite(historyId)) {
        return c.json({ error: "Invalid history id" }, 400);
      }
      await markArtistHistoryFailed(c.get("instances"), c.req.param("instanceId"), historyId);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mark failed failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/releases/grab", async (c) => {
    const parsed = ArtistReleaseGrabRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      await grabArtistRelease(c.get("instances"), c.req.param("instanceId"), parsed.data);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Grab failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.put("/:instanceId/:artistId/albums/monitor", async (c) => {
    const parsed = ArtistAlbumsMonitorRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      await setAlbumsMonitored(
        c.get("instances"),
        c.req.param("instanceId"),
        parsed.data.albumIds,
        parsed.data.monitored,
      );
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Monitor update failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:artistId/albums/:albumId/search", async (c) => {
    try {
      const albumId = Number(c.req.param("albumId"));
      if (!Number.isFinite(albumId)) {
        return c.json({ error: "Invalid album id" }, 400);
      }
      await searchAlbum(c.get("instances"), c.req.param("instanceId"), albumId);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Album search failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:artistId/albums/:albumId/tracks", async (c) => {
    try {
      const artistId = Number(c.req.param("artistId"));
      const albumId = Number(c.req.param("albumId"));
      if (!Number.isFinite(artistId) || !Number.isFinite(albumId)) {
        return c.json({ error: "Invalid artist or album id" }, 400);
      }
      const payload = await fetchArtistAlbumTracks(
        c.get("instances"),
        c.req.param("instanceId"),
        artistId,
        albumId,
      );
      return c.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load album tracks";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:artistId/albums", async (c) => {
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      const groups = await fetchArtistAlbums(
        c.get("instances"),
        c.req.param("instanceId"),
        artistId,
      );
      return c.json({ groups });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load albums";
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

  app.post("/:instanceId/:artistId/search", async (c) => {
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      await searchArtist(c.get("instances"), c.req.param("instanceId"), artistId);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:artistId/history", async (c) => {
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      const events = await fetchArtistHistory(
        c.get("instances"),
        c.req.param("instanceId"),
        artistId,
      );
      return c.json({ events });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load history";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:artistId/releases", async (c) => {
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      const releases = await fetchArtistReleases(
        c.get("instances"),
        c.req.param("instanceId"),
        artistId,
      );
      return c.json({ releases });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load releases";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:artistId/blocklist", async (c) => {
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      const items = await fetchArtistBlocklist(
        c.get("instances"),
        c.req.param("instanceId"),
        artistId,
      );
      return c.json({ items });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load blocklist";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:artistId/files", async (c) => {
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      const files = await fetchArtistManageFiles(
        c.get("instances"),
        c.req.param("instanceId"),
        artistId,
      );
      return c.json({ files });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load files";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:artistId/rename", async (c) => {
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      const items = await fetchArtistRenamePreview(
        c.get("instances"),
        c.req.param("instanceId"),
        artistId,
      );
      return c.json({ items });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load rename preview";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:artistId/organize", async (c) => {
    const parsed = ArtistOrganizeRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      await organizeArtistFiles(
        c.get("instances"),
        c.req.param("instanceId"),
        artistId,
        parsed.data.files,
      );
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Organize failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:artistId/retag", async (c) => {
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      const items = await fetchArtistRetagPreview(
        c.get("instances"),
        c.req.param("instanceId"),
        artistId,
      );
      return c.json({ items });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load retag preview";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:artistId/retag", async (c) => {
    const parsed = ArtistRetagRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      await retagArtistFiles(
        c.get("instances"),
        c.req.param("instanceId"),
        artistId,
        parsed.data.files,
      );
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Retag failed";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.post("/:instanceId/:artistId/monitoring", async (c) => {
    const parsed = ArtistMonitoringRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      const artistId = Number(c.req.param("artistId"));
      if (!Number.isFinite(artistId)) {
        return c.json({ error: "Invalid artist id" }, 400);
      }
      await updateArtistAlbumMonitoring(
        c.get("instances"),
        c.req.param("instanceId"),
        artistId,
        parsed.data.monitor,
      );
      c.get("libraryCache").invalidate(c.req.param("instanceId"));
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Monitoring update failed";
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
      const detail = await fetchArtistPageDetail(
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
