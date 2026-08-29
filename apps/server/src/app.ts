import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./config/env.js";
import type { Instance } from "@umbrellarr/shared";
import type { InstanceStore } from "./config/instanceStore.js";
import { createAuthRoutes } from "./routes/auth.js";
import { createHealthRoutes } from "./routes/health.js";
import { createInstancesRoutes } from "./routes/instances.js";
import { createMediaRoutes } from "./routes/media.js";
import { createMoviesRoutes } from "./routes/movies.js";
import { createStatsRoutes } from "./routes/stats.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import type { LibraryCache } from "./cache/libraryCache.js";

export type AppVariables = {
  env: Env;
  instances: Instance[];
  instanceStore: InstanceStore;
  libraryCache: LibraryCache;
};

export function createApp(env: Env, instanceStore: InstanceStore, libraryCache: LibraryCache) {
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
    c.set("libraryCache", libraryCache);
    await next();
  });

  app.route("/api/auth", createAuthRoutes());
  app.use("/api/*", createAuthMiddleware());
  app.route("/api/health", createHealthRoutes());
  app.route("/api/instances", createInstancesRoutes());
  app.route("/api/stats", createStatsRoutes());
  app.route("/api/movies", createMoviesRoutes());
  app.route("/api/media", createMediaRoutes());

  app.get("/api", (c) => c.json({ name: "umbrellarr", ok: true }));

  return app;
}
