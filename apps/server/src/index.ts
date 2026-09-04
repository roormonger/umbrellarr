import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { LibraryCache } from "./cache/libraryCache.js";
import { initMediaImageCache } from "./cache/mediaImageCache.js";
import { AppearanceStore } from "./config/appearanceStore.js";
import { CalendarFeedStore } from "./config/calendarFeedStore.js";
import { loadEnv } from "./config/env.js";
import { InstanceStore } from "./config/instanceStore.js";
import { openDatabase } from "./db/client.js";
import { LibraryIndexStore } from "./db/libraryIndex.js";
import { ArrSignalRSync } from "./sync/arrSignalR.js";
import { syncRevisionStore } from "./sync/revisionStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__dirname, "../../../.env") });

async function main() {
  const env = loadEnv();
  const databasePath =
    env.DATABASE_PATH ?? path.resolve(__dirname, "../../../data/umbrellarr.db");

  console.log(`[db] ${databasePath}`);
  const db = openDatabase(databasePath);
  initMediaImageCache(path.dirname(databasePath));
  const libraryIndex = new LibraryIndexStore(db);

  const libraryCache = new LibraryCache({
    durable: {
      loadMovies: (id) => libraryIndex.loadMovies(id),
      loadSeries: (id) => libraryIndex.loadSeries(id),
      loadArtists: (id) => libraryIndex.loadArtists(id),
      saveMovies: (id, movies, fetchedAt) => libraryIndex.saveMovies(id, movies, fetchedAt),
      saveSeries: (id, series, fetchedAt) => libraryIndex.saveSeries(id, series, fetchedAt),
      saveArtists: (id, artists, fetchedAt) => libraryIndex.saveArtists(id, artists, fetchedAt),
    },
    onLibraryUpdated: () => {
      syncRevisionStore.bump(["library"]);
    },
  });

  const signalR = new ArrSignalRSync(libraryCache);

  const instanceStore = new InstanceStore({
    db,
    secretsKey: env.instanceSecretsKey,
    onChange: (next) => {
      libraryCache.warm(next);
      signalR.start(next);
    },
  });
  const appearanceStore = new AppearanceStore(db);
  const calendarFeedStore = new CalendarFeedStore(db);
  const instances = instanceStore.bootstrapFromEnvIfEmpty();

  const app = createApp(
    env,
    instanceStore,
    libraryCache,
    appearanceStore,
    calendarFeedStore,
  );

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

  if (instances.length > 0) {
    const hydrated = libraryCache.hydrateFromDurable(instances);
    if (hydrated > 0) {
      console.log(`[cache] hydrated ${hydrated} library snapshot(s) from SQLite`);
      syncRevisionStore.bump(["library"]);
    }
    console.log(`[cache] warming ${instances.length} instance library snapshot(s)…`);
    libraryCache.warm(instances);
    signalR.start(instances);
  }

  serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, (info) => {
    console.log(`[umbrellarr] listening on http://${info.address}:${info.port}`);
  });
}

main().catch((error) => {
  console.error("[umbrellarr] failed to start", error);
  process.exit(1);
});
