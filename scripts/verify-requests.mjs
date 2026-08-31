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
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path} → ${res.status} ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  const cookies = await loginCookies();
  const instances = await apiJson("/api/instances", cookies.header);
  const seerr = (instances.instances ?? []).find((i) => i.kind === "seerr");
  if (!seerr) throw new Error("No Seerr instance configured");

  const pending = await apiJson(
    `/api/requests/${encodeURIComponent(seerr.id)}?take=25&filter=pending`,
    cookies.header,
  );
  const all = await apiJson(
    `/api/requests/${encodeURIComponent(seerr.id)}?take=25&filter=all`,
    cookies.header,
  );
  const users = await apiJson(
    `/api/requests/${encodeURIComponent(seerr.id)}/users`,
    cookies.header,
  );
  if (!Array.isArray(users.users) || users.users.length === 0) {
    throw new Error("Expected Seerr users");
  }
  if (!Array.isArray(all.results)) {
    throw new Error("Expected request results");
  }
  console.log(
    `api ok: ${pending.pageInfo.results} pending, ${all.pageInfo.results} all, ${users.users.length} users`,
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (cookies.token) {
    await context.addCookies([
      {
        name: "umbrellarr_session",
        value: cookies.token,
        url: webBase,
      },
    ]);
  }
  const page = await context.newPage();
  await page.goto(`${webBase}/requests/${seerr.id}`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/requests/${seerr.id}`, { waitUntil: "domcontentloaded" });
  }

  await page.getByText("Filter").waitFor({ timeout: 15_000 });
  if (pending.pageInfo.results === 0) {
    await page.getByText("No requests match this filter.").waitFor({ timeout: 15_000 });
  }

  await page.getByRole("textbox", { name: "Filter" }).click();
  await page.getByRole("option", { name: "All" }).click();
  for (const item of all.results.slice(0, 3)) {
    await page.getByText(item.title, { exact: true }).first().waitFor({ timeout: 15_000 });
  }

  await page.getByRole("navigation").getByText("Requests").waitFor();
  await page.goto(`${webBase}/movies`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[id^=movie-]", { timeout: 20_000 });

  console.log(`ui ok: /requests/${seerr.id} list + movies still load`);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
