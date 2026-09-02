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

async function main() {
  const cookies = await loginCookies();
  const instancesRes = await apiJson("/api/instances", cookies.header);
  const instances = instancesRes.body.instances ?? [];
  const arrInstances = instances.filter((i) =>
    ["radarr", "sonarr", "lidarr"].includes(i.kind),
  );
  if (arrInstances.length === 0) throw new Error("no Arr instances configured");

  const unified = await apiJson("/api/history/unified?pageSize=50", cookies.header);
  if (!unified.res.ok) {
    throw new Error(`unified history failed ${unified.res.status} ${JSON.stringify(unified.body)}`);
  }
  if (!Array.isArray(unified.body.items)) {
    throw new Error("unified history missing items array");
  }
  console.log(
    `api ok: unified history ${unified.body.totalRecords ?? unified.body.items.length} items`,
  );

  const radarr = arrInstances.find((i) => i.kind === "radarr");
  if (radarr) {
    const filtered = await apiJson(
      `/api/history/unified?instanceId=${encodeURIComponent(radarr.id)}`,
      cookies.header,
    );
    if (!filtered.res.ok) {
      throw new Error(`filtered unified history failed ${filtered.res.status}`);
    }
    for (const item of filtered.body.items ?? []) {
      if (item.instanceId !== radarr.id) {
        throw new Error("instance filter returned items from another instance");
      }
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (cookies.token) {
    await context.addCookies([
      { name: "umbrellarr_session", value: cookies.token, url: webBase },
    ]);
  }
  const page = await context.newPage();
  await page.goto(`${webBase}/activity/history`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/activity/history`, { waitUntil: "domcontentloaded" });
  }

  await page.getByRole("button", { name: "Refresh" }).waitFor({ timeout: 20_000 });
  await page.getByRole("columnheader", { name: "Title" }).waitFor();
  await page.getByRole("columnheader", { name: "Instance" }).waitFor();
  await page.getByRole("columnheader", { name: "Languages" }).waitFor();
  await page.getByRole("columnheader", { name: "Quality" }).waitFor();
  await page.getByRole("columnheader", { name: "Formats" }).waitFor();
  await page.getByRole("columnheader", { name: "Date" }).waitFor();
  await page.locator('[data-nav-link="history"]').waitFor();

  const kinds = new Set((unified.body.items ?? []).map((item) => item.kind));
  if (kinds.size > 1) {
    console.log(`ui ok: mixed history kinds ${[...kinds].join(", ")}`);
  }

  if (radarr) {
    await page.goto(`${webBase}/movies/${radarr.id}/history`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(`**/activity/history?instance=${radarr.id}`, { timeout: 10_000 });

    await page.getByRole("textbox", { name: "Instance filter" }).click();
    await page.getByRole("option", { name: "All instances", exact: true }).click();
    await page.waitForURL("**/activity/history", { timeout: 10_000 });

    await page.getByRole("textbox", { name: "Instance filter" }).click();
    const radarrOption = page.getByRole("option", { name: new RegExp(radarr.name) });
    await radarrOption.first().click();
    await page.waitForURL(`**/activity/history?instance=${radarr.id}`, { timeout: 10_000 });
  }

  const rows = page.locator("[data-history-row]");
  const rowCount = await rows.count();
  if (rowCount === 0) {
    await page.getByText("No history events.").waitFor();
    await browser.close();
    console.log("ui ok: unified history empty state");
    return;
  }

  await rows.first().getByRole("button", { name: "History details" }).click();
  await page.getByRole("dialog").waitFor({ timeout: 10_000 });
  await page.keyboard.press("Escape");

  await browser.close();
  console.log(`ui ok: unified history with ${rowCount} visible row(s)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
