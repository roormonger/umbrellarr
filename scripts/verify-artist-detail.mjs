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
  if (!lidarrUrl || !lidarrKey) return null;
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
  const lidarr = await ensureLidarr(cookie);
  if (!lidarr) {
    throw new Error("No Lidarr instance configured");
  }

  const list = await apiJson(`/api/artists?instanceId=${encodeURIComponent(lidarr.id)}`, cookie);
  const artist = list.artists?.[0];
  if (!artist) {
    throw new Error("Expected at least one Lidarr artist");
  }

  const base = `/api/artists/${encodeURIComponent(lidarr.id)}/${artist.externalId}`;
  const detail = await apiJson(base, cookie);
  if (!detail.title || detail.externalId !== artist.externalId) {
    throw new Error("Artist page detail missing title/id");
  }
  if (!Array.isArray(detail.albumTypes)) {
    throw new Error("Expected albumTypes on artist page detail");
  }

  const albums = await apiJson(`${base}/albums`, cookie);
  if (!Array.isArray(albums.groups) || albums.groups.length === 0) {
    throw new Error("Expected album type groups from Lidarr");
  }
  for (const group of albums.groups) {
    if (!group.albumType || !Array.isArray(group.albums)) {
      throw new Error("Invalid album group");
    }
  }

  await apiJson(`${base}/history`, cookie);
  await apiJson(`${base}/files`, cookie);
  await apiJson(`${base}/rename`, cookie);
  await apiJson(`/api/artists/${encodeURIComponent(lidarr.id)}/naming`, cookie);
  await apiJson(`/api/artists/${encodeURIComponent(lidarr.id)}/qualities`, cookie);

  console.log(
    `api ok: ${detail.title} — ${albums.groups.length} album types (${albums.groups
      .map((g) => `${g.albumType}:${g.albums.length}`)
      .join(", ")})`,
  );
  return { lidarr, artist, groups: albums.groups };
}

async function verifyUi(lidarr, artist, groups, token) {
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
  await page.goto(`${webBase}/music/${lidarr.id}`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/music/${lidarr.id}`, { waitUntil: "domcontentloaded" });
  }
  const card = page.locator(`[id="artist-${lidarr.id}-${artist.externalId}"]`).first();
  await card.waitFor({ timeout: 25_000 });
  await card.locator("[class*='posterSurface']").click();
  await page.waitForURL(`**/music/${lidarr.id}/${artist.externalId}`, { timeout: 15_000 });

  try {
    await page.waitForSelector("section h1", { timeout: 20_000 });
    await page.getByRole("toolbar", { name: "Artist actions" }).waitFor({ timeout: 15_000 });
    await page.getByRole("button", { name: "Refresh & Scan" }).waitFor();
    await page.getByRole("button", { name: "Search Artist" }).waitFor();
    await page.getByRole("button", { name: "Interactive Search" }).waitFor();
    await page.getByRole("button", { name: "History" }).waitFor();
    await page.waitForSelector('section[aria-label="Albums"]', { timeout: 20_000 });
  } catch (error) {
    console.error("ui url:", page.url());
    console.error("ui text:", (await page.locator("body").innerText()).slice(0, 800));
    throw error;
  }

  const firstType = groups[0]?.albumType;
  if (firstType) {
    const expand = page.getByRole("button", { name: new RegExp(firstType) }).first();
    await expand.waitFor({ timeout: 15_000 });
    if ((await expand.getAttribute("aria-expanded")) === "false") {
      await expand.click();
    }
    await page.waitForSelector('section[aria-label="Albums"] table', { timeout: 15_000 });
  }

  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("dialog").waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 10_000 });

  const renameBtn = page.getByRole("button", { name: "Preview Rename" });
  if (await renameBtn.isEnabled()) {
    await renameBtn.click();
    await page.getByRole("dialog").waitFor({ timeout: 15_000 });
    await page.getByRole("button", { name: /Cancel|Close/ }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 10_000 });
  }

  const filesBtn = page.getByRole("button", { name: "Manage Files" });
  if (await filesBtn.isEnabled()) {
    await filesBtn.click();
    await page.getByRole("dialog").waitFor({ timeout: 15_000 });
    await page.getByRole("button", { name: /Cancel|Close/ }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 10_000 });
  }

  await page.goto(`${webBase}/shows`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[id^=series-]", { timeout: 20_000 });
  await page.goto(`${webBase}/movies`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[id^=movie-]", { timeout: 20_000 });

  console.log(`ui ok: grid→detail + toolbar + ${firstType ?? "albums"} + history/organize/files`);
  await browser.close();
}

async function main() {
  const cookies = await loginCookies();
  const { lidarr, artist, groups } = await verifyApi(cookies.header);
  await verifyUi(lidarr, artist, groups, cookies.token);
  console.log("artist detail verification passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
