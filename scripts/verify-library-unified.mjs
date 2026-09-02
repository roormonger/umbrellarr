import { chromium } from "playwright";

const webBase = process.env.VERIFY_WEB_BASE ?? "http://localhost:5173";
const apiBase = process.env.VERIFY_API_BASE ?? "http://localhost:3000";
const password = process.env.APP_PASSWORD;

function cookieHeader(setCookieValues) {
  return setCookieValues
    .map((value) => value.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

function sessionToken(setCookieValues) {
  for (const value of setCookieValues) {
    const match = value.match(/umbrellarr_session=([^;]+)/);
    if (match) return match[1];
  }
  return "";
}

async function loginCookies() {
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(password ? { password } : {}),
  });
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  }
  const setCookies = res.headers.getSetCookie?.() ?? [];
  if (setCookies.length === 0 && res.headers.get("set-cookie")) {
    setCookies.push(res.headers.get("set-cookie"));
  }
  return {
    header: cookieHeader(setCookies),
    token: sessionToken(setCookies),
  };
}

async function apiJson(path, cookie) {
  const res = await fetch(`${apiBase}${path}`, { headers: { cookie } });
  const body = await res.json();
  return { res, body };
}

function duplicateTmdbGroups(movies) {
  const byTmdb = new Map();
  for (const movie of movies) {
    if (movie.tmdbId == null) continue;
    const key = String(movie.tmdbId);
    const bucket = byTmdb.get(key);
    if (bucket) bucket.push(movie);
    else byTmdb.set(key, [movie]);
  }
  return [...byTmdb.values()].filter((group) => {
    const instances = new Set(group.map((movie) => movie.instanceId));
    return instances.size > 1;
  });
}

async function main() {
  const cookies = await loginCookies();
  const instancesRes = await apiJson("/api/instances", cookies.header);
  const instances = instancesRes.body.instances ?? [];
  const radarrs = instances.filter((i) => i.kind === "radarr");
  if (radarrs.length === 0) throw new Error("no Radarr instances configured");

  const unified = await apiJson("/api/movies", cookies.header);
  if (!unified.res.ok) {
    throw new Error(`unified movies failed ${unified.res.status} ${JSON.stringify(unified.body)}`);
  }
  const movies = unified.body.movies ?? [];
  console.log(`api ok: unified movies ${movies.length} item(s)`);

  const radarr = radarrs[0];
  const filtered = await apiJson(`/api/movies?instanceId=${encodeURIComponent(radarr.id)}`, cookies.header);
  if (!filtered.res.ok) {
    throw new Error(`filtered movies failed ${filtered.res.status}`);
  }
  for (const movie of filtered.body.movies ?? []) {
    if (movie.instanceId !== radarr.id) {
      throw new Error("instance filter returned movies from another instance");
    }
  }

  const multiGroups = duplicateTmdbGroups(movies);
  if (multiGroups.length > 0) {
    console.log(`api ok: ${multiGroups.length} tmdbId group(s) span multiple Radarr instances`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (cookies.token) {
    await context.addCookies([
      { name: "umbrellarr_session", value: cookies.token, url: webBase },
    ]);
  }
  const page = await context.newPage();
  await page.goto(`${webBase}/movies`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/movies`, { waitUntil: "domcontentloaded" });
  }

  await page.waitForURL("**/movies", { timeout: 10_000 });
  if (new URL(page.url()).pathname !== "/movies") {
    throw new Error(`expected /movies, got ${page.url()}`);
  }

  await page.getByRole("textbox", { name: "Instance filter" }).waitFor({ timeout: 20_000 });

  await page.goto(`${webBase}/movies/${radarr.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(`**/movies?instance=${radarr.id}`, { timeout: 10_000 });

  await page.getByRole("textbox", { name: "Instance filter" }).click();
  await page.getByRole("option", { name: "All instances", exact: true }).click();
  await page.waitForURL((url) => {
    const parsed = new URL(url);
    return parsed.pathname === "/movies" && !parsed.searchParams.has("instance");
  }, { timeout: 10_000 });

  if (radarrs.length >= 2) {
    const other = radarrs.find((i) => i.id !== radarr.id) ?? radarrs[1];
    await page.getByRole("textbox", { name: "Instance filter" }).click();
    await page.getByRole("option", { name: other.name, exact: true }).click();
    await page.waitForURL(`**/movies?instance=${other.id}`, { timeout: 10_000 });
  }

  if (multiGroups.length > 0) {
    const stackCards = page.locator("[data-multi-instance]");
    const stackCount = await stackCards.count();
    if (stackCount === 0) {
      throw new Error("expected at least one multi-instance movie card with stack badge");
    }
    const firstCard = stackCards.first();
    const badgeText = await firstCard.locator("[class*='stackCount']").textContent();
    const badgeCount = Number.parseInt(badgeText ?? "", 10);
    const segmentCount = await firstCard.locator("[class*='barSegment']").count();
    if (!Number.isFinite(badgeCount) || segmentCount !== badgeCount) {
      throw new Error(
        `bar segments ${segmentCount} should match stack count ${badgeText ?? "?"}`,
      );
    }
    console.log(`ui ok: ${stackCount} multi-instance movie card(s), bar split verified`);
  } else {
    console.log("ui ok: no cross-instance tmdb duplicates in library (stack badge skipped)");
  }

  await browser.close();
  console.log("ui ok: unified movies library");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
