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

  const pendingUnified = await apiJson(
    `/api/requests/unified?take=25&filter=pending`,
    cookies.header,
  );
  const all = await apiJson(`/api/requests/unified?take=25&filter=all`, cookies.header);
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
  const first = all.results.find((item) => item.instanceId === seerr.id) ?? all.results[0];
  if (first?.instanceId) {
    const page = await apiJson(
      `/api/requests/${encodeURIComponent(first.instanceId)}/${first.id}/page`,
      cookies.header,
    );
    if (!page.media?.title || page.request?.id !== first.id) {
      throw new Error("Expected request page payload with media.title");
    }
    console.log(
      `api ok: ${pendingUnified.pageInfo.results} pending (unified), ${all.pageInfo.results} all, ${users.users.length} users, page “${page.media.title}” (${page.media.cast?.length ?? 0} cast)`,
    );
  } else {
    console.log(
      `api ok: ${pendingUnified.pageInfo.results} pending (unified), ${all.pageInfo.results} all, ${users.users.length} users`,
    );
  }

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
  await page.goto(`${webBase}/requests`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/requests`, { waitUntil: "domcontentloaded" });
  }

  await page.getByRole("textbox", { name: "Instance filter" }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Pending" }).waitFor({ timeout: 15_000 });
  if (pendingUnified.pageInfo.results === 0) {
    await page.getByText("No requests match this filter.").waitFor({ timeout: 15_000 });
  }

  await page.getByRole("button", { name: "Pending" }).click();
  await page.getByRole("menuitem", { name: "All" }).click();
  for (const item of all.results.slice(0, 3)) {
    await page.getByText(item.title, { exact: true }).first().waitFor({ timeout: 15_000 });
  }

  if (first) {
    const firstTitle = first.title;
    await page.getByRole("button", { name: firstTitle }).first().click();
    await page.waitForURL(`**/requests/${first.instanceId}/${first.id}`, {
      timeout: 15_000,
    });
    await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 20_000 });
    await page.getByRole("toolbar", { name: "Request actions" }).waitFor();
    await page.goBack();
    await page.waitForURL("**/requests", { timeout: 15_000 });
  }

  await page.locator('[data-nav-link="requests"]').click();
  await page.waitForURL("**/requests", { timeout: 10_000 });
  await page.goto(`${webBase}/movies`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[id^=movie-]", { timeout: 20_000 });

  console.log("ui ok: /requests list → detail → back + movies still load");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
