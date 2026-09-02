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

  const sidebarHeader = page.locator("[data-sidebar-header]");
  await sidebarHeader.waitFor();
  await sidebarHeader.getByText("Umbrellarr").waitFor();

  const side = await sidebarHeader.boundingBox();
  const header = await page.locator(".mantine-AppShell-header").boundingBox();
  if (!side || !header) throw new Error("missing boxes");

  if (Math.abs(side.height - 60) > 1) {
    throw new Error(`sidebar header height ${side.height}, expected 60`);
  }
  if (Math.abs(side.y - header.y) > 1) {
    throw new Error(`top mismatch sidebar=${side.y} header=${header.y}`);
  }
  if (Math.abs(side.y + side.height - (header.y + header.height)) > 1) {
    throw new Error(
      `bottom mismatch sidebar=${side.y + side.height} header=${header.y + header.height}`,
    );
  }

  console.log("ok: sidebar header aligned with top bar", {
    height: side.height,
    y: side.y,
    headerX: header.x,
    sidebarRight: side.x + side.width,
  });
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
