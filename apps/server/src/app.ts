import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./config/env.js";
import type { Instance } from "@umbrellarr/shared";
import type { AppearanceStore } from "./config/appearanceStore.js";
import type { CalendarFeedStore } from "./config/calendarFeedStore.js";
import type { InstanceStore } from "./config/instanceStore.js";
import { createAuthRoutes } from "./routes/auth.js";
import { createCalendarIcsRoutes, createCalendarRoutes } from "./routes/calendar.js";
import { createCollectionsRoutes } from "./routes/collections.js";
import { createHealthRoutes } from "./routes/health.js";
import { createInstancesRoutes } from "./routes/instances.js";
import { createMediaRoutes } from "./routes/media.js";
import { createMoviesRoutes } from "./routes/movies.js";
import { createArtistsRoutes } from "./routes/artists.js";
import { createHistoryRoutes } from "./routes/history.js";
import { createQueueRoutes } from "./routes/queue.js";
import { createIndexersRoutes } from "./routes/indexers.js";
import { createDiscoverRoutes } from "./routes/discover.js";
import { createWantedRoutes } from "./routes/wanted.js";
import { createRequestsRoutes } from "./routes/requests.js";
import { createIssuesRoutes } from "./routes/issues.js";
import { createShowsRoutes } from "./routes/shows.js";
import { createStatsRoutes } from "./routes/stats.js";
import { createSettingsRoutes } from "./routes/settings.js";
import { createSyncRoutes } from "./routes/sync.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import type { LibraryCache } from "./cache/libraryCache.js";

export type AppVariables = {
  env: Env;
  instances: Instance[];
  instanceStore: InstanceStore;
  appearanceStore: AppearanceStore;
  calendarFeedStore: CalendarFeedStore;
  libraryCache: LibraryCache;
};

export function createApp(
  env: Env,
  instanceStore: InstanceStore,
  libraryCache: LibraryCache,
  appearanceStore: AppearanceStore,
  calendarFeedStore: CalendarFeedStore,
) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use("*", logger());
  app.use(
    "/api/*",
    cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true,
      exposeHeaders: ["X-Cache", "X-Cache-Fetched-At"],
    }),
  );

  app.use("*", async (c, next) => {
    c.set("env", env);
    c.set("instanceStore", instanceStore);
    c.set("instances", instanceStore.list());
    c.set("appearanceStore", appearanceStore);
    c.set("calendarFeedStore", calendarFeedStore);
    c.set("libraryCache", libraryCache);
    await next();
  });

  app.route("/api/auth", createAuthRoutes());
  // Public ICS before auth middleware (token validated in the route).
  app.route("/api", createCalendarIcsRoutes());
  app.use("/api/*", createAuthMiddleware());
  app.route("/api/health", createHealthRoutes());
  app.route("/api/instances", createInstancesRoutes());
  // GET appearance is public (see auth middleware); PUT requires a session.
  app.route("/api/settings", createSettingsRoutes());
  app.route("/api/stats", createStatsRoutes());
  app.route("/api/sync", createSyncRoutes());
  app.route("/api/calendar", createCalendarRoutes());
  app.route("/api/collections", createCollectionsRoutes());
  app.route("/api/queue", createQueueRoutes());
  app.route("/api/history", createHistoryRoutes());
  app.route("/api/wanted", createWantedRoutes());
  app.route("/api/indexers", createIndexersRoutes());
  app.route("/api/discover", createDiscoverRoutes());
  app.route("/api/movies", createMoviesRoutes());
  app.route("/api/shows", createShowsRoutes());
  app.route("/api/artists", createArtistsRoutes());
  app.route("/api/requests", createRequestsRoutes());
  app.route("/api/issues", createIssuesRoutes());
  app.route("/api/media", createMediaRoutes());

  app.get("/api", (c) => c.json({ name: "umbrellarr", ok: true }));

  return app;
}
