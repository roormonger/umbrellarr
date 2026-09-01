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

async function main() {
  const cookies = await loginCookies();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 2);

  const calendar = await apiJson(
    `/api/calendar?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`,
    cookies.header,
  );
  if (!calendar.res.ok) {
    throw new Error(`calendar failed ${calendar.res.status} ${JSON.stringify(calendar.body)}`);
  }
  const events = calendar.body.events ?? [];
  const errors = calendar.body.errors ?? [];
  if (!Array.isArray(events)) throw new Error("calendar.events missing");
  for (const event of events.slice(0, 20)) {
    if (!event.id || !event.kind || !event.instanceId || !event.title || !event.start) {
      throw new Error(`malformed event ${JSON.stringify(event)}`);
    }
    if (!["movie", "episode", "album"].includes(event.kind)) {
      throw new Error(`unexpected kind ${event.kind}`);
    }
  }

  const ensure = await apiJson("/api/settings/calendar/token/ensure", cookies.header, {
    method: "POST",
  });
  if (!ensure.res.ok || !ensure.body?.feedToken || !ensure.body?.feedPath) {
    throw new Error(`ensure token failed ${ensure.res.status} ${JSON.stringify(ensure.body)}`);
  }

  const ics = await fetch(`${apiBase}${ensure.body.feedPath}`);
  if (!ics.ok) throw new Error(`ics failed ${ics.status} ${await ics.text()}`);
  const icsBody = await ics.text();
  if (!icsBody.includes("BEGIN:VCALENDAR") || !icsBody.includes("X-WR-CALNAME:Umbrellarr")) {
    throw new Error("ics missing VCALENDAR header");
  }
  if (events.length > 0 && !icsBody.includes("BEGIN:VEVENT")) {
    console.warn("warning: json events in month window but ics window (past 7 / future 28) has none");
  }

  const bad = await fetch(`${apiBase}/api/calendar.ics?token=not-a-real-token`);
  if (bad.status !== 401) {
    throw new Error(`expected 401 for bad ics token, got ${bad.status}`);
  }

  const noCookie = await fetch(
    `${apiBase}/api/calendar?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`,
  );
  if (password && noCookie.status !== 401) {
    throw new Error(`expected calendar JSON to require auth, got ${noCookie.status}`);
  }

  console.log(
    `api ok: ${events.length} events, ${errors.length} instance error(s), ics ${icsBody.length} bytes`,
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (cookies.token) {
    await context.addCookies([
      { name: "umbrellarr_session", value: cookies.token, url: webBase },
    ]);
  }
  const page = await context.newPage();
  await page.goto(`${webBase}/activity/calendar`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/activity/calendar`, { waitUntil: "domcontentloaded" });
  }

  await page.getByRole("grid", { name: "Calendar" }).waitFor({ timeout: 20_000 });
  await page.getByText("Downloaded (Monitored)").waitFor();
  await page.getByRole("button", { name: "iCal Link" }).waitFor();
  await page.locator("[data-calendar-event]").first().waitFor({ timeout: 10_000 });
  await page.locator(".mantine-SegmentedControl-label", { hasText: /^Agenda$/ }).click();
  await page.locator("[data-calendar-view=agenda]").waitFor({ timeout: 15_000 });
  await page.locator(".mantine-SegmentedControl-label", { hasText: /^Month$/ }).click();
  await page.getByRole("grid", { name: "Calendar" }).waitFor();

  const chip = page.locator("[data-calendar-event]").first();
  const kind = await chip.getAttribute("data-calendar-event");
  await chip.click();
  if (kind === "movie") {
    await page.waitForURL(/\/movies\/[^/]+\/\d+/, { timeout: 15_000 });
  } else if (kind === "episode") {
    await page.waitForURL(/\/shows\/[^/]+\/\d+/, { timeout: 15_000 });
  } else if (kind === "album") {
    await page.waitForURL(/\/music\/[^/]+\/\d+/, { timeout: 15_000 });
  } else {
    throw new Error(`unknown event kind ${kind}`);
  }
  await page.goto(`${webBase}/activity/calendar`, { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "iCal Link" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByLabel("Feed URL").waitFor({ timeout: 15_000 });
  const feedValue = await dialog.getByLabel("Feed URL").inputValue();
  if (!feedValue.includes("/api/calendar.ics?token=")) {
    throw new Error(`unexpected feed url ${feedValue}`);
  }
  await dialog.getByRole("button", { name: "Copy link" }).waitFor();

  await page.goto(`${webBase}/settings`, { waitUntil: "domcontentloaded" });
  await page.getByText("Calendar feed").waitFor();
  await page.getByLabel("Feed URL").waitFor({ timeout: 10_000 });

  await browser.close();
  console.log("ui ok: month grid, agenda, iCal modal, settings feed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
