import { Hono } from "hono";
import type { DashboardStats, NavCounts } from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import { activityListCache } from "../cache/ttlCache.js";
import { fetchUnifiedHistory } from "../servarr/history.js";
import { fetchUnifiedQueue } from "../servarr/queue.js";
import { getUnifiedOpenIssueCount } from "../servarr/seerrIssues.js";
import { getUnifiedPendingRequestCount } from "../servarr/seerrRequests.js";
import { checkInstanceStatus } from "../servarr/status.js";

async function cachedCount(key: string, ttlMs: number, fetch: () => Promise<number>): Promise<number> {
  const hit = activityListCache.get<number>(key);
  if (hit != null) return hit;
  const value = await fetch();
  activityListCache.set(key, value, ttlMs);
  return value;
}

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

    const libraryCounts = libraryCache.peekNavLibraryCounts(instances);

    const [statuses, pendingRequests, openIssues, queueTotal, historyTotal] = await Promise.all([
      Promise.all(instances.map((instance) => checkInstanceStatus(instance))),
      hasSeerr
        ? cachedCount("stats:pending-requests", 45_000, () => getUnifiedPendingRequestCount(instances))
        : Promise.resolve(0),
      hasSeerr
        ? cachedCount("stats:open-issues", 45_000, () => getUnifiedOpenIssueCount(instances))
        : Promise.resolve(0),
      hasArr
        ? cachedCount("stats:queue-total", 20_000, async () => {
            const result = await fetchUnifiedQueue(instances, { page: 1, pageSize: 1 });
            return result.totalRecords;
          })
        : Promise.resolve(0),
      hasArr
        ? cachedCount("stats:history-total", 45_000, async () => {
            const result = await fetchUnifiedHistory(instances, { page: 1, pageSize: 1 });
            return result.totalRecords;
          })
        : Promise.resolve(0),
    ]);

    const nav: NavCounts = {};
    if (hasRadarr && libraryCounts.movies != null) nav.movies = libraryCounts.movies;
    if (hasSonarr && libraryCounts.shows != null) nav.shows = libraryCounts.shows;
    if (hasLidarr && libraryCounts.music != null) nav.music = libraryCounts.music;
    if (hasSeerr) nav.requests = pendingRequests;
    if (hasSeerr) nav.issues = openIssues;
    if (hasArr) nav.queue = queueTotal;
    if (hasArr) nav.history = historyTotal;

    const stats: DashboardStats = {
      queueCount: queueTotal,
      missingCount: 0,
      instancesOnline: statuses.filter((status) => status.online).length,
      instancesTotal: statuses.length,
      nav,
    };
    return c.json(stats);
  });

  return app;
}
