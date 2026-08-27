import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { loadInstancesFromEnv } from "./config/instances.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__dirname, "../../../.env") });

const env = loadEnv();
const instances = loadInstancesFromEnv();
const app = createApp(env, instances);

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

serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, (info) => {
  console.log(`[umbrellarr] listening on http://${info.address}:${info.port}`);
});
