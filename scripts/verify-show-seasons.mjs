import { chromium } from "playwright";

const webBase = process.env.VERIFY_WEB_BASE ?? "http://localhost:5173";
const apiBase = process.env.VERIFY_API_BASE ?? "http://localhost:3000";
const password = process.env.APP_PASSWORD;
const instanceId = process.env.VERIFY_SONARR_INSTANCE ?? "sonarr";
const seriesId = Number(process.env.VERIFY_SERIES_ID ?? "859");

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

async function apiGet(path, cookie) {
  const res = await fetch(`${apiBase}${path}`, {
    headers: cookie ? { cookie } : {},
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path} → ${res.status} ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

async function verifyApi(cookie) {
  const seasons = await apiGet(`/api/shows/${instanceId}/${seriesId}/seasons`, cookie);
  if (!Array.isArray(seasons.seasons) || seasons.seasons.length === 0) {
    throw new Error("Expected season summaries from Sonarr");
  }
  const seasonTwo = seasons.seasons.find((s) => s.seasonNumber === 2) ?? seasons.seasons[0];
  const episodes = await apiGet(
    `/api/shows/${instanceId}/${seriesId}/episodes?seasonNumber=${seasonTwo.seasonNumber}`,
    cookie,
  );
  if (!Array.isArray(episodes.episodes) || episodes.episodes.length === 0) {
    throw new Error(`Expected episodes for season ${seasonTwo.seasonNumber}`);
  }
  const statuses = new Set(episodes.episodes.map((e) => e.status));
  for (const status of statuses) {
    if (!["downloaded", "missing", "unmonitored", "unaired"].includes(status)) {
      throw new Error(`Unexpected episode status ${status}`);
    }
  }
  await apiGet(
    `/api/shows/${instanceId}/${seriesId}/history?seasonNumber=${seasonTwo.seasonNumber}`,
    cookie,
  );
  await apiGet(
    `/api/shows/${instanceId}/${seriesId}/files?seasonNumber=${seasonTwo.seasonNumber}`,
    cookie,
  );
  await apiGet(
    `/api/shows/${instanceId}/${seriesId}/rename?seasonNumber=${seasonTwo.seasonNumber}`,
    cookie,
  );
  console.log(
    `api ok: ${seasons.seasons.length} seasons, season ${seasonTwo.seasonNumber} has ${episodes.episodes.length} episodes (${[...statuses].join(", ")})`,
  );
  return seasonTwo.seasonNumber;
}

async function verifyUi(seasonNumber, token) {
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
  await page.goto(`${webBase}/shows/${instanceId}/${seriesId}`, {
    waitUntil: "domcontentloaded",
  });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/shows/${instanceId}/${seriesId}`, {
      waitUntil: "domcontentloaded",
    });
  }
  try {
    await page.waitForSelector("section h1", { timeout: 20_000 });
    await page.waitForSelector('section[aria-label="Seasons"]', { timeout: 20_000 });
    await page.waitForFunction(
      () =>
        /Season|Specials|Failed to load seasons/i.test(
          document.querySelector('section[aria-label="Seasons"]')?.innerText ?? "",
        ),
      null,
      { timeout: 20_000 },
    );
  } catch (error) {
    console.error("ui url:", page.url());
    console.error("ui text:", (await page.locator("body").innerText()).slice(0, 800));
    throw error;
  }
  const seasonName = seasonNumber === 0 ? "Specials" : `Season ${seasonNumber}`;
  const expand = page.getByRole("button", { name: new RegExp(seasonName) }).first();
  await expand.waitFor({ timeout: 15_000 });
  await expand.click();
  await page.waitForSelector("table", { timeout: 15_000 });
  await page.getByRole("button", { name: `Search ${seasonName}`, exact: true }).waitFor();
  await page
    .getByRole("button", { name: `Interactive search ${seasonName}`, exact: true })
    .waitFor();
  await page.getByRole("button", { name: `History ${seasonName}`, exact: true }).waitFor();
  console.log(`ui ok: ${seasonName} expander + tools + episode table`);
  await browser.close();
}

async function main() {
  const cookies = await loginCookies();
  const seasonNumber = await verifyApi(cookies.header);
  await verifyUi(seasonNumber, cookies.token);
  console.log("show seasons verification passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
