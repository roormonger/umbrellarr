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

async function apiJson(path, cookie, init) {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { cookie, ...(init?.body ? { "content-type": "application/json" } : {}) },
    ...init,
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function assertQueueList(cookie, instance, label) {
  const list = await apiJson(
    `/api/queue?instanceId=${encodeURIComponent(instance.id)}`,
    cookie,
  );
  if (!list.res.ok) {
    throw new Error(`${label} queue list failed ${list.res.status} ${JSON.stringify(list.body)}`);
  }
  if (!Array.isArray(list.body.items)) {
    throw new Error(`${label} queue list missing items array`);
  }
  const hidden = await apiJson(
    `/api/queue?instanceId=${encodeURIComponent(instance.id)}&includeUnknown=false`,
    cookie,
  );
  if (!hidden.res.ok) {
    throw new Error(`${label} unknown toggle refetch failed ${hidden.res.status}`);
  }
  return list.body;
}

async function main() {
  const cookies = await loginCookies();
  const instances = await apiJson("/api/instances", cookies.header);
  const radarr = (instances.body.instances ?? []).find((i) => i.kind === "radarr");
  if (!radarr) throw new Error("No Radarr instance configured");

  const radarrQueue = await assertQueueList(cookies.header, radarr, "radarr");
  console.log(`api ok: radarr queue ${radarrQueue.totalRecords ?? radarrQueue.items.length} items`);

  const sonarr = (instances.body.instances ?? []).find((i) => i.kind === "sonarr");
  if (sonarr) {
    const sonarrQueue = await assertQueueList(cookies.header, sonarr, "sonarr");
    console.log(`api ok: sonarr queue ${sonarrQueue.totalRecords ?? sonarrQueue.items.length} items`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (cookies.token) {
    await context.addCookies([
      { name: "umbrellarr_session", value: cookies.token, url: webBase },
    ]);
  }
  const page = await context.newPage();
  const queueUrl = `${webBase}/activity/queue?instance=${encodeURIComponent(radarr.id)}`;
  await page.goto(queueUrl, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(queueUrl, { waitUntil: "domcontentloaded" });
  }

  await page.waitForURL(`**/activity/queue?instance=${radarr.id}`, { timeout: 10_000 });

  await page.getByRole("button", { name: "Refresh" }).waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "Options" }).click();
  const unknownSwitch = page.getByRole("switch");
  await unknownSwitch.waitFor();
  await unknownSwitch.click();
  await page.getByRole("button", { name: "Options" }).click();

  const rows = page.locator("[data-queue-row]");
  const rowCount = await rows.count();
  if (rowCount === 0) {
    await page.getByText("Queue is empty.").waitFor();
    await browser.close();
    console.log("ui ok: empty queue, Options unknown toggle; skip remove/import");
    return;
  }

  await rows.first().getByRole("checkbox").click();
  const removeSelected = page.getByRole("button", { name: /Remove Selected/ });
  await removeSelected.waitFor();
  if (await removeSelected.isDisabled()) {
    throw new Error("Remove Selected should enable after selecting a row");
  }
  await removeSelected.click();
  await page.getByRole("dialog").waitFor();
  await page.getByText(/Are you sure you want to remove/).waitFor();
  await page.getByRole("button", { name: "Close" }).click();

  const importRow = page.locator("[data-queue-row][data-download-id]:not([data-download-id=''])").first();
  if ((await importRow.count()) > 0) {
    await importRow.getByRole("button", { name: "Manual import" }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "Cancel" }).click();
    console.log("ui ok: Options toggle, Remove modal, Manual Import modal");
  } else {
    console.log("ui ok: Options toggle, Remove modal; skip import (no downloadId)");
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
