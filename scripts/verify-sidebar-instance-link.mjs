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

async function main() {
  const cookies = await loginCookies();
  const instancesRes = await fetch(`${apiBase}/api/instances`, {
    headers: { cookie: cookies.header },
  });
  if (!instancesRes.ok) throw new Error(`instances failed ${instancesRes.status}`);
  const instances = (await instancesRes.json()).instances ?? [];
  if (instances.length === 0) throw new Error("no instances configured");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (cookies.token) {
    await context.addCookies([
      { name: "umbrellarr_session", value: cookies.token, url: webBase },
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

  for (const instance of instances) {
    const link = page.locator(`a[data-instance-link="${instance.kind}"][href="${instance.baseUrl}"]`);
    await link.waitFor({ timeout: 10_000 });
    const target = await link.getAttribute("target");
    const title = await link.getAttribute("title");
    if (target !== "_blank") throw new Error(`${instance.name} link is not target=_blank`);
    if (title !== instance.baseUrl) {
      throw new Error(`${instance.name} tooltip was “${title}”, expected URL`);
    }
  }

  const radarr = instances.find((i) => i.kind === "radarr");
  if (radarr) {
    const popupPromise = page.waitForEvent("popup", { timeout: 5_000 }).catch(() => null);
    await page.locator(`a[data-instance-link="radarr"][href="${radarr.baseUrl}"]`).click();
    const popup = await popupPromise;
    if (!popup) throw new Error("expected Radarr instance to open in a new tab");
    await popup.close();
    if (!page.url().includes("/settings")) {
      throw new Error(`icon click navigated the app away: ${page.url()}`);
    }

    await page.getByRole("navigation").getByText(radarr.name, { exact: true }).click();
    await page.waitForURL(`**/movies/${radarr.id}`, { timeout: 10_000 });
  }

  await browser.close();
  console.log(`ui ok: ${instances.length} instance link(s) in sidebar`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
