import { Hono } from "hono";
import type { Instance } from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import { arrFetch, arrJson } from "../servarr/client.js";
import {
  isImageContentType,
  isPublicHttpUrl,
  lidarrArtistIdFromCoverPath,
  lidarrCoverPathCandidates,
  lidarrFallbackCoverApiPaths,
  pickLidarrPosterRemoteUrl,
  toGridPosterPath,
  type LidarrCoverImage,
} from "../servarr/mediaCover.js";

const artistCoverCache = new Map<
  string,
  { images?: LidarrCoverImage[]; expiresAt: number }
>();

/**
 * Proxy *arr MediaCover (and similar) assets so the browser never sees API keys.
 * Radarr/Sonarr: `/MediaCover/{id}/poster-500.jpg`
 * Lidarr: `/api/v1/mediacover/artist/{id}/{filename}` (SPA `/MediaCover/` is login HTML)
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
      const candidates =
        instance.kind === "lidarr"
          ? lidarrCoverPathCandidates(path)
          : uniquePaths(toGridPosterPath(path), path);

      let upstream: Response | undefined;
      for (const candidate of candidates) {
        const response = await fetchArrImage(instance, candidate);
        if (response) {
          upstream = response;
          break;
        }
      }

      if (!upstream && instance.kind === "lidarr") {
        const extras = await lidarrExtraCoverPaths(instance, path);
        for (const candidate of extras) {
          const response = await fetchArrImage(instance, candidate);
          if (response) {
            upstream = response;
            break;
          }
        }
        if (!upstream) {
          const remoteUrl = await lidarrHttpRemoteUrl(instance, path);
          if (remoteUrl) upstream = await fetchRemoteImage(remoteUrl);
        }
      }

      if (!upstream) {
        return c.json({ error: "Upstream image not available" }, 404);
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

function uniquePaths(...paths: string[]): string[] {
  return [...new Set(paths)];
}

async function fetchArrImage(instance: Instance, path: string): Promise<Response | undefined> {
  const response = await arrFetch(instance, path, {
    headers: { Accept: "image/*,*/*" },
    timeoutMs: 20_000,
    redirect: "manual",
  });
  if (response.ok && isImageContentType(response.headers.get("content-type"))) {
    return response;
  }
  await response.body?.cancel();
  return undefined;
}

async function lidarrArtistImages(
  instance: Instance,
  artistId: number,
): Promise<LidarrCoverImage[] | undefined> {
  const cacheKey = `${instance.id}:${artistId}`;
  const cached = artistCoverCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.images;

  try {
    const artist = await arrJson<{ images?: LidarrCoverImage[] }>(
      instance,
      `/api/v1/artist/${artistId}`,
    );
    artistCoverCache.set(cacheKey, {
      images: artist.images,
      expiresAt: Date.now() + 10 * 60_000,
    });
    return artist.images;
  } catch {
    artistCoverCache.set(cacheKey, { expiresAt: Date.now() + 30_000 });
    return undefined;
  }
}

async function lidarrExtraCoverPaths(instance: Instance, path: string): Promise<string[]> {
  const artistId = lidarrArtistIdFromCoverPath(path);
  if (artistId == null) return [];
  const images = await lidarrArtistImages(instance, artistId);
  return lidarrFallbackCoverApiPaths(artistId, images, path);
}

async function lidarrHttpRemoteUrl(instance: Instance, path: string): Promise<string | undefined> {
  const artistId = lidarrArtistIdFromCoverPath(path);
  if (artistId == null) return undefined;
  const images = await lidarrArtistImages(instance, artistId);
  const remote = pickLidarrPosterRemoteUrl(images);
  return remote && isPublicHttpUrl(remote) ? remote : undefined;
}

async function fetchRemoteImage(url: string): Promise<Response | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "image/*,*/*" },
      redirect: "follow",
    });
    if (response.ok && isImageContentType(response.headers.get("content-type"))) {
      return response;
    }
    await response.body?.cancel();
    return undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}
