import { chromium } from "playwright";

const webBase = process.env.VERIFY_WEB_BASE ?? "http://localhost:5173";
const apiBase = process.env.VERIFY_API_BASE ?? "http://localhost:3000";
const password = process.env.APP_PASSWORD;

async function main() {
  const login = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(password ? { password } : {}),
  });
  if (!login.ok) throw new Error(`login ${login.status}`);
  const setCookies = login.headers.getSetCookie?.() ?? [];
  const token =
    setCookies.map((v) => v.match(/umbrellarr_session=([^;]+)/)?.[1]).find(Boolean) ?? "";

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (token) {
    await context.addCookies([
      { name: "umbrellarr_session", value: token, url: webBase },
    ]);
  }
  const page = await context.newPage();
  await page.goto(`${webBase}/settings`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/settings`, { waitUntil: "domcontentloaded" });
  }

  // Force dark scheme for this check.
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-mantine-color-scheme", "dark");
  });

  await page.goto(`${webBase}/activity/history`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Refresh" }).waitFor({ timeout: 20_000 });
  await page
    .locator("[data-history-row], :text('No history events.')")
    .first()
    .waitFor({ timeout: 20_000 });

  const historyRow = page.locator("[data-history-row]").first();
  let hovered = false;
  if ((await historyRow.count()) > 0) {
    await historyRow.getByLabel("History details").hover({ force: true });
    hovered = true;
  } else {
    const instancesRes = await fetch(`${apiBase}/api/instances`, {
      headers: { cookie: `umbrellarr_session=${token}` },
    });
    const radarr = ((await instancesRes.json()).instances ?? []).find((i) => i.kind === "radarr");
    if (radarr) {
      await page.goto(`${webBase}/movies/${radarr.id}`, { waitUntil: "domcontentloaded" });
      const monitored = page.getByRole("button", { name: /monitored|unmonitored/i }).first();
      await monitored.waitFor({ timeout: 20_000 });
      await monitored.hover({ force: true });
      hovered = true;
    }
  }

  if (!hovered) {
    throw new Error("no tooltip target found");
  }
  const tooltip = page.locator(".mantine-Tooltip-tooltip").first();
  await tooltip.waitFor({ state: "visible", timeout: 5_000 });
  const color = await tooltip.evaluate((el) => getComputedStyle(el).color);
  // rgb(255, 255, 255)
  if (color !== "rgb(255, 255, 255)") {
    throw new Error(`expected white tooltip text, got ${color}`);
  }
  console.log("ok: tooltip text is white in dark mode");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
