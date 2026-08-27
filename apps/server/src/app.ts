import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./config/env.js";
import type { Instance } from "@umbrellarr/shared";
import { createAuthRoutes } from "./routes/auth.js";
import { createHealthRoutes } from "./routes/health.js";
import { createInstancesRoutes } from "./routes/instances.js";
import { createStatsRoutes } from "./routes/stats.js";
import { createAuthMiddleware } from "./middleware/auth.js";

export type AppVariables = {
  env: Env;
  instances: Instance[];
};

export function createApp(env: Env, instances: Instance[]) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use("*", logger());
  app.use(
    "/api/*",
    cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true,
    }),
  );

  app.use("*", async (c, next) => {
    c.set("env", env);
    c.set("instances", instances);
    await next();
  });

  app.route("/api/auth", createAuthRoutes());
  app.use("/api/*", createAuthMiddleware());
  app.route("/api/health", createHealthRoutes());
  app.route("/api/instances", createInstancesRoutes());
  app.route("/api/stats", createStatsRoutes());

  app.get("/api", (c) => c.json({ name: "umbrellarr", ok: true }));

  return app;
}
