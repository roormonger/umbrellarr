import { Hono } from "hono";
import type { DashboardStats, NavCounts } from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import {
  countUniqueArtists,
  countUniqueMovies,
  countUniqueShows,
} from "../lib/libraryDedup.js";
import { fetchUnifiedHistory } from "../servarr/history.js";
import { fetchUnifiedQueue } from "../servarr/queue.js";
import { getUnifiedOpenIssueCount } from "../servarr/seerrIssues.js";
import { getUnifiedPendingRequestCount } from "../servarr/seerrRequests.js";
import { checkInstanceStatus } from "../servarr/status.js";

export function createStatsRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/", async (c) => {
    const instances = c.get("instances");
    const libraryCache = c.get("libraryCache");
    const hasRadarr = instances.some((instance) => instance.kind === "radarr");
    const hasSonarr = instances.some((instance) => instance.kind === "sonarr");
    const hasLidarr = instances.some((instance) => instance.kind === "lidarr");
    const hasSeerr = instances.some((instance) => instance.kind === "seerr");
    const hasArr = hasRadarr || hasSonarr || hasLidarr;

    const [
      statuses,
      moviesResult,
      showsResult,
      artistsResult,
      pendingRequests,
      openIssues,
      queueResult,
      historyResult,
    ] = await Promise.all([
      Promise.all(instances.map((instance) => checkInstanceStatus(instance))),
      hasRadarr ? libraryCache.getMovies(instances) : Promise.resolve(null),
      hasSonarr ? libraryCache.getSeries(instances) : Promise.resolve(null),
      hasLidarr ? libraryCache.getArtists(instances) : Promise.resolve(null),
      hasSeerr ? getUnifiedPendingRequestCount(instances) : Promise.resolve(0),
      hasSeerr ? getUnifiedOpenIssueCount(instances) : Promise.resolve(0),
      hasArr
        ? fetchUnifiedQueue(instances, { page: 1, pageSize: 1 })
        : Promise.resolve(null),
      hasArr
        ? fetchUnifiedHistory(instances, { page: 1, pageSize: 1 })
        : Promise.resolve(null),
    ]);

    const nav: NavCounts = {};
    if (moviesResult) nav.movies = countUniqueMovies(moviesResult.movies);
    if (showsResult) nav.shows = countUniqueShows(showsResult.series);
    if (artistsResult) nav.music = countUniqueArtists(artistsResult.artists);
    if (hasSeerr) nav.requests = pendingRequests;
    if (hasSeerr) nav.issues = openIssues;
    if (queueResult) nav.queue = queueResult.totalRecords;
    if (historyResult) nav.history = historyResult.totalRecords;

    const queueCount = queueResult?.totalRecords ?? 0;
    const stats: DashboardStats = {
      queueCount,
      missingCount: 0,
      instancesOnline: statuses.filter((status) => status.online).length,
      instancesTotal: statuses.length,
      nav,
    };
    return c.json(stats);
  });

  return app;
}
