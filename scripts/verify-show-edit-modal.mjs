import { chromium } from "playwright";

const webBase = process.env.VERIFY_WEB_BASE ?? "http://localhost:5173";
const apiBase = process.env.VERIFY_API_BASE ?? "http://localhost:3000";
const password = process.env.APP_PASSWORD;
const instanceId = process.env.VERIFY_SONARR_INSTANCE ?? "sonarr";

async function sessionToken() {
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(password ? { password } : {}),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const value of setCookies) {
    const match = value.match(/umbrellarr_session=([^;]+)/);
    if (match) return match[1];
  }
  return "";
}

async function main() {
  const token = await sessionToken();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (token) {
    await context.addCookies([{ name: "umbrellarr_session", value: token, url: webBase }]);
  }
  const page = await context.newPage();
  await page.goto(`${webBase}/shows/${instanceId}`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/shows/${instanceId}`, { waitUntil: "domcontentloaded" });
  }

  const card = page.locator('[class*="card"]').filter({ hasText: /Happy Family/i }).first();
  await card.waitFor({ timeout: 25_000 });
  await card.hover();
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 15_000 });
  const text = await dialog.innerText();

  const required = [
    "Download monitored episodes in this series",
    "Monitor New Seasons",
    "Which new seasons should be monitored automatically",
    "Use Season Folder",
    "Sort episodes into season folders",
    "Quality Profile",
    "Series Type",
    "Series type is used for renaming, parsing and searching",
    "Path",
    "Tags",
  ];
  for (const snippet of required) {
    if (!text.includes(snippet)) {
      throw new Error(`Missing edit copy: ${snippet}\n\nGot:\n${text.slice(0, 1200)}`);
    }
  }

  // Field order: Monitor New Seasons before Use Season Folder before Quality before Series Type.
  const idx = (s) => text.indexOf(s);
  if (
    !(
      idx("Monitor New Seasons") < idx("Use Season Folder") &&
      idx("Use Season Folder") < idx("Quality Profile") &&
      idx("Quality Profile") < idx("Series Type") &&
      idx("Series Type") < idx("Path")
    )
  ) {
    throw new Error("Edit field order does not match Sonarr");
  }

  await page.getByRole("textbox", { name: "Monitor New Seasons" }).click();
  await page.getByRole("option", { name: /All Seasons/i }).waitFor();
  console.log("show edit modal labels + order ok");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
