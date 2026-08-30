import { chromium } from "playwright";

const webBase = "http://localhost:5173";
const apiBase = "http://localhost:3000";
const password = process.env.APP_PASSWORD;

const res = await fetch(`${apiBase}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(password ? { password } : {}),
});
const setCookies = res.headers.getSetCookie?.() ?? [];
let token = "";
for (const value of setCookies) {
  const match = value.match(/umbrellarr_session=([^;]+)/);
  if (match) token = match[1];
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
if (token) {
  await context.addCookies([{ name: "umbrellarr_session", value: token, url: webBase }]);
}
const page = await context.newPage();
await page.goto(`${webBase}/settings`, { waitUntil: "domcontentloaded" });
if (page.url().includes("/login") && password) {
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !location.pathname.includes("/login"));
  await page.goto(`${webBase}/settings`, { waitUntil: "domcontentloaded" });
}

await page.getByRole("heading", { name: "Appearance" }).waitFor({ timeout: 20_000 });

const count = () => page.locator('[aria-label^="Highlight color #"]').count();

for (let i = 0; i < 5; i += 1) {
  const n = await count();
  console.log(`page ${i + 1}: ${n}`);
  if (n !== 20) throw new Error(`forward page ${i + 1} has ${n}`);
  await page.getByLabel("Next preset page").click();
  await page.getByText(`${i + 2} / 6`).waitFor();
}

console.log(`page 6: ${await count()}`);
if ((await count()) !== 20) throw new Error("last page bad count");

for (let i = 0; i < 5; i += 1) {
  await page.getByLabel("Previous preset page").click();
  await page.getByText(`${5 - i} / 6`).waitFor();
  const n = await count();
  console.log(`back to page ${5 - i}: ${n}`);
  if (n !== 20) throw new Error(`back page ${5 - i} has ${n}`);
}

console.log(`page 1 after roundtrip: ${await count()}`);
await browser.close();
console.log("no accumulation — always 20 swatches");
