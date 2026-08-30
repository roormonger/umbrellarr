import { chromium } from "playwright";

const webBase = process.env.VERIFY_WEB_BASE ?? "http://localhost:5173";
const apiBase = process.env.VERIFY_API_BASE ?? "http://localhost:3000";
const password = process.env.APP_PASSWORD;
const lidarrUrl = process.env.LIDARR_URL?.trim();
const lidarrKey = process.env.LIDARR_API_KEY?.trim();

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

async function api(path, cookie, init = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(cookie ? { cookie } : {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body, text };
}

async function apiJson(path, cookie, init = {}) {
  const { res, body, text } = await api(path, cookie, init);
  if (!res.ok) {
    throw new Error(`${path} → ${res.status} ${String(text).slice(0, 300)}`);
  }
  return body;
}

async function ensureLidarr(cookie) {
  const data = await apiJson("/api/instances", cookie);
  const existing = (data.instances ?? []).find((i) => i.kind === "lidarr");
  if (existing) return existing;

  if (!lidarrUrl || !lidarrKey) {
    return null;
  }

  const created = await apiJson("/api/instances", cookie, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Lidarr",
      kind: "lidarr",
      baseUrl: lidarrUrl.replace(/\/+$/, ""),
      apiKey: lidarrKey,
    }),
  });
  return created.instance;
}

async function verifyApi(cookie) {
  const instances = await apiJson("/api/instances", cookie);
  const lidarr = await ensureLidarr(cookie);
  const radarr = (instances.instances ?? []).find((i) => i.kind === "radarr");

  if (!lidarr) {
    if (radarr) {
      const rejected = await api(`/api/artists?instanceId=${encodeURIComponent(radarr.id)}`, cookie);
      if (rejected.res.status !== 400) {
        throw new Error(`Expected 400 for non-Lidarr artists list, got ${rejected.res.status}`);
      }
    }
    const empty = await apiJson("/api/artists", cookie);
    if (!Array.isArray(empty.artists) || empty.artists.length !== 0) {
      throw new Error("Expected empty artists list when no Lidarr clients exist");
    }
    console.log("api ok: no Lidarr client; non-Lidarr rejected; empty artist list");
    return { lidarr: null, artist: null };
  }

  const test = await apiJson("/api/instances/test", cookie, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: lidarr.id, kind: "lidarr", baseUrl: lidarr.baseUrl }),
  });
  if (!test.online) {
    throw new Error(`Lidarr test failed: ${test.error ?? "offline"}`);
  }

  if (radarr) {
    const rejected = await api(`/api/artists?instanceId=${encodeURIComponent(radarr.id)}`, cookie);
    if (rejected.res.status !== 400) {
      throw new Error(`Expected 400 for non-Lidarr artists list, got ${rejected.res.status}`);
    }
  }

  const list = await apiJson(`/api/artists?instanceId=${encodeURIComponent(lidarr.id)}`, cookie);
  if (!Array.isArray(list.artists)) {
    throw new Error("Expected artists array");
  }
  const options = await apiJson(`/api/artists/${encodeURIComponent(lidarr.id)}/options`, cookie);
  if (!options.metadataProfiles?.length) {
    throw new Error("Expected metadata profiles from Lidarr");
  }
  if (!options.qualityProfiles?.length) {
    throw new Error("Expected quality profiles from Lidarr");
  }

  const first = list.artists[0];
  if (!first) {
    console.log(`api ok: lidarr ${lidarr.id} online v${test.version ?? "?"}, 0 artists`);
    return { lidarr, artist: null };
  }

  const detail = await apiJson(
    `/api/artists/${encodeURIComponent(lidarr.id)}/${first.externalId}`,
    cookie,
  );
  const saved = await apiJson(
    `/api/artists/${encodeURIComponent(lidarr.id)}/${first.externalId}`,
    cookie,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        monitored: detail.monitored,
        monitorNewItems: detail.monitorNewItems,
        qualityProfileId: detail.qualityProfileId,
        metadataProfileId: detail.metadataProfileId,
        path: detail.path,
        tagIds: detail.tagIds,
      }),
    },
  );
  if (saved.metadataProfileId !== detail.metadataProfileId) {
    throw new Error("Edit round-trip lost metadataProfileId");
  }

  const links = await apiJson(
    `/api/artists/${encodeURIComponent(lidarr.id)}/${first.externalId}/links`,
    cookie,
  );
  if (!Array.isArray(links.links)) {
    throw new Error("Expected links array");
  }

  await apiJson(
    `/api/artists/${encodeURIComponent(lidarr.id)}/${first.externalId}/refresh`,
    cookie,
    { method: "POST" },
  );

  const squareSafe = list.artists.filter((a) => a.posterUrl).length;
  console.log(
    `api ok: lidarr ${lidarr.id} v${test.version ?? "?"}, ${list.artists.length} artists, ${squareSafe} covers, edit+refresh+links`,
  );
  return { lidarr, artist: first };
}

async function verifyUi(lidarr, artist, token) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (token) {
    await context.addCookies([
      {
        name: "umbrellarr_session",
        value: token,
        url: webBase,
      },
    ]);
  }
  const page = await context.newPage();

  await page.goto(`${webBase}/settings`, { waitUntil: "domcontentloaded" });
  const passwordField = page.getByLabel("Password");
  try {
    await passwordField.waitFor({ timeout: 4_000 });
  } catch {
    // already authenticated
  }
  if (await passwordField.isVisible().catch(() => false)) {
    if (!password) throw new Error("Login required but APP_PASSWORD is unset");
    await passwordField.fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/settings`, { waitUntil: "domcontentloaded" });
  }
  try {
    await page.getByRole("button", { name: "Add client" }).waitFor({ timeout: 15_000 });
  } catch (error) {
    console.error("ui url:", page.url());
    console.error("ui text:", (await page.locator("body").innerText()).slice(0, 800));
    throw error;
  }
  await page.getByRole("button", { name: "Add client" }).click();
  await page.getByRole("textbox", { name: "Kind" }).click();
  await page.getByRole("option", { name: "Lidarr (Music)" }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Cancel" }).click();
  console.log("ui ok: Settings Kind includes Lidarr (Music)");

  if (!lidarr) {
    await page.goto(`${webBase}/music`, { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/settings", { timeout: 15_000 });
    console.log("ui ok: /music redirects to Settings without a Lidarr client");
    await browser.close();
    return;
  }

  await page.goto(`${webBase}/music/${lidarr.id}`, { waitUntil: "domcontentloaded" });
  await page.getByText("Music", { exact: true }).first().waitFor({ timeout: 15_000 });
  if (!artist) {
    await page.getByText(/No artists found|No artists match/i).waitFor({ timeout: 15_000 });
    console.log("ui ok: Music empty state");
    await browser.close();
    return;
  }

  const card = page.locator(`[id="artist-${lidarr.id}-${artist.externalId}"]`).first();
  await card.waitFor({ timeout: 25_000 });
  const wrap = card.locator("[class*='posterWrap']").first();
  const ratio = await wrap.evaluate((el) => getComputedStyle(el).aspectRatio);
  if (ratio !== "1 / 1" && ratio !== "1") {
    throw new Error(`Expected square artist cover, got aspect-ratio ${ratio}`);
  }

  await card.hover();
  await page.getByRole("button", { name: "Refresh info" }).first().waitFor();
  await page.getByRole("button", { name: "Edit" }).first().click();
  await page.getByText("Metadata Profile").waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Cancel" }).click();

  await card.hover();
  await page.getByRole("button", { name: "Links" }).first().click();
  await page.getByText("Links", { exact: true }).waitFor({ timeout: 10_000 });

  console.log(`ui ok: Music grid square cover + edit + links for ${artist.title}`);
  await browser.close();
}

async function main() {
  const cookies = await loginCookies();
  const { lidarr, artist } = await verifyApi(cookies.header);
  await verifyUi(lidarr, artist, cookies.token);
  console.log("music grid verification passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
