import { chromium } from "playwright";

const webBase = process.env.VERIFY_WEB_BASE ?? "http://localhost:5173";
const password = process.env.APP_PASSWORD;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${webBase}/login`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.locator("input").first().fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
  }
  await page.goto(`${webBase}/shows/sonarr/859`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("section h1", { timeout: 25_000 });
  await page.waitForFunction(
    () => /TMDb/i.test(document.querySelector("section")?.innerText ?? ""),
    null,
    { timeout: 15_000 },
  );
  const text = await page.locator("section").innerText();
  console.log(text.split("\n").slice(0, 6).join(" | "));
  console.log("hero ratings ok");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
