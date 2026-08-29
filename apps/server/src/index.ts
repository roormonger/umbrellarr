import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { LibraryCache } from "./cache/libraryCache.js";
import { loadEnv } from "./config/env.js";
import { InstanceStore } from "./config/instanceStore.js";
import { openDatabase } from "./db/client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__dirname, "../../../.env") });

async function main() {
  const env = loadEnv();
  const databasePath =
    env.DATABASE_PATH ?? path.resolve(__dirname, "../../../data/umbrellarr.db");

  const libraryCache = new LibraryCache();

  console.log(`[db] ${databasePath}`);
  const db = openDatabase(databasePath);

  const instanceStore = new InstanceStore({
    db,
    secretsKey: env.instanceSecretsKey,
  });
  const instances = instanceStore.bootstrapFromEnvIfEmpty();

  const app = createApp(env, instanceStore, libraryCache);

  const webDist = path.resolve(__dirname, "../../web/dist");

  if (existsSync(webDist)) {
    // Serve the built SPA from apps/web/dist in production / Docker.
    app.use("/*", serveStatic({ root: webDist }));
    app.get("*", async (c) => {
      const html = await readFile(path.join(webDist, "index.html"), "utf8");
      return c.html(html);
    });
  }

  console.log(
    `[umbrellarr] ${instances.length} instance(s) configured; auth ${env.authRequired ? "enabled" : "disabled (dev)"}`,
  );
  console.log("[cache] in-memory library snapshots (on demand + mutation refresh)");

  serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, (info) => {
    console.log(`[umbrellarr] listening on http://${info.address}:${info.port}`);
  });
}

main().catch((error) => {
  console.error("[umbrellarr] failed to start", error);
  process.exit(1);
});
