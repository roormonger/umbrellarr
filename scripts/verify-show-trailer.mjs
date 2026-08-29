/**
 * Smoke-check show detail trailer resolution against the local BFF.
 * Usage: node --env-file=.env scripts/verify-show-trailer.mjs [instanceId] [seriesId]
 *    or: pnpm --filter @umbrellarr/server exec tsx ../../scripts/verify-show-trailer.mjs …
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m || process.env[m[1]] != null) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  } catch {
    // optional
  }
}

loadEnvFile();

const base = process.env.VERIFY_API_BASE ?? "http://localhost:3000";
const password = process.env.APP_PASSWORD;
const instanceId = process.argv[2];
const seriesId = process.argv[3];

async function login(jar) {
  if (!password) return jar;
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    const part = c.split(";")[0];
    if (part) jar.push(part);
  }
  return jar;
}

async function main() {
  const jar = await login([]);
  const headers = jar.length ? { Cookie: jar.join("; ") } : {};

  if (!instanceId || !seriesId) {
    const list = await fetch(`${base}/api/shows`, { headers });
    if (!list.ok) throw new Error(`list shows failed: ${list.status}`);
    const data = await list.json();
    const first = data.series?.[0];
    if (!first) throw new Error("no series in library");
    console.log("using", first.instanceId, first.externalId, first.title);
    const trailer = await fetch(
      `${base}/api/shows/${encodeURIComponent(first.instanceId)}/${first.externalId}/trailer`,
      { headers },
    );
    const body = await trailer.json();
    console.log("trailer", trailer.status, body);
    return;
  }

  const trailer = await fetch(
    `${base}/api/shows/${encodeURIComponent(instanceId)}/${seriesId}/trailer`,
    { headers },
  );
  const body = await trailer.json();
  console.log("trailer", trailer.status, body);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
