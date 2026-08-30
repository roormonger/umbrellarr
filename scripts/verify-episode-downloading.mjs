import { chromium } from "playwright";

const webBase = process.env.VERIFY_WEB_BASE ?? "http://localhost:5173";
const password = process.env.APP_PASSWORD;
const seriesId = process.env.VERIFY_SERIES_ID ?? "5";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${webBase}/shows/sonarr/${seriesId}`, { waitUntil: "domcontentloaded" });
  const pw = page.getByLabel("Password");
  if (await pw.isVisible().catch(() => false)) {
    if (!password) throw new Error("Login required");
    await pw.fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/shows/sonarr/${seriesId}`, { waitUntil: "domcontentloaded" });
  }
  await page.waitForSelector('section[aria-label="Seasons"]', { timeout: 25_000 });
  const season22 = page.getByRole("button", { name: /Season 22/i }).first();
  if (await season22.count()) {
    await season22.click();
  } else {
    await page.getByRole("button", { name: /Season /i }).first().click();
  }
  await page.getByLabel("Downloading").first().waitFor({ timeout: 15_000 });
  const n = await page.getByLabel("Downloading").count();
  console.log(`ui ok: ${n} downloading icon(s) on series ${seriesId}`);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
