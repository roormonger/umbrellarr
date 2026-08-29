/**
 * Compare movie vs show MediaDetailHero geometry at the same viewport.
 * Usage: node --env-file=.env scripts/verify-hero-geometry.mjs
 */
import { chromium } from "playwright";
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

const webBase = process.env.VERIFY_WEB_BASE ?? "http://localhost:5173";
const password = process.env.APP_PASSWORD;
const apiBase = process.env.VERIFY_API_BASE ?? "http://localhost:3000";

async function loginApi() {
  const jar = [];
  if (!password) return jar;
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(`api login ${res.status}`);
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const part = c.split(";")[0];
    if (part) jar.push(part);
  }
  return jar;
}

async function findMovieId(cookie) {
  const res = await fetch(`${apiBase}/api/movies`, {
    headers: cookie.length ? { Cookie: cookie.join("; ") } : {},
  });
  if (!res.ok) throw new Error(`movies ${res.status}`);
  const data = await res.json();
  const hit =
    data.movies?.find((m) => /cloverfield/i.test(m.title)) ?? data.movies?.[0];
  if (!hit) throw new Error("no movies");
  return { instanceId: hit.instanceId, movieId: hit.externalId, title: hit.title };
}

async function login(page) {
  await page.goto(`${webBase}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  if (!password || !page.url().includes("/login")) return;
  await page.locator("input").first().fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !location.pathname.includes("/login"), {
    timeout: 15_000,
  });
}

async function measure(page) {
  return page.evaluate(() => {
    const hero = document.querySelector("section");
    const top = hero?.querySelector(":scope > div");
    const kids = top ? [...top.children] : [];
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
      };
    };
    return {
      top: rect(top),
      poster: rect(kids[0]),
      synopsis: rect(kids[1]),
      links: rect(kids[2]),
      meta: rect(kids[3]),
      trailer: rect(kids[4]),
    };
  });
}

function assertNear(label, a, b, tol = 2) {
  if (Math.abs(a - b) > tol) {
    throw new Error(`${label}: ${a} vs ${b} (tol ${tol})`);
  }
}

async function main() {
  const cookie = await loginApi();
  const movie = await findMovieId(cookie);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await login(page);

  await page.goto(`${webBase}/movies/${movie.instanceId}/${movie.movieId}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("section h1", { timeout: 25_000 });
  await page.waitForTimeout(1200);
  const movieGeom = await measure(page);
  console.log("MOVIE", movie.title, JSON.stringify(movieGeom));

  await page.goto(`${webBase}/shows/sonarr/859`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("section h1", { timeout: 25_000 });
  await page.waitForTimeout(1500);
  const showGeom = await measure(page);
  console.log("SHOW", JSON.stringify(showGeom));

  assertNear("grid height", movieGeom.top.h, 450);
  assertNear("show grid height", showGeom.top.h, 450);
  assertNear("movie vs show grid h", movieGeom.top.h, showGeom.top.h);
  assertNear("movie synopsis=links", movieGeom.synopsis.h, movieGeom.links.h);
  assertNear("show synopsis=links", showGeom.synopsis.h, showGeom.links.h);
  assertNear("movie meta=trailer", movieGeom.meta.h, movieGeom.trailer.h);
  assertNear("show meta=trailer", showGeom.meta.h, showGeom.trailer.h);
  assertNear("movie vs show synopsis h", movieGeom.synopsis.h, showGeom.synopsis.h, 4);
  assertNear("movie vs show trailer h", movieGeom.trailer.h, showGeom.trailer.h, 4);
  assertNear("movie vs show links w", movieGeom.links.w, showGeom.links.w, 8);

  console.log("shared hero geometry checks passed");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
