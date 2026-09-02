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
  const seerrInstances = (instances.instances ?? []).filter((i) => i.kind === "seerr");
  if (seerrInstances.length === 0) throw new Error("No Seerr instance configured");

  const openUnified = await apiJson("/api/issues/unified?take=25&filter=open", cookies.header);
  if (!Array.isArray(openUnified.results)) {
    throw new Error("Expected issue results array");
  }
  console.log(`api ok: unified issues ${openUnified.pageInfo?.results ?? openUnified.results.length} total`);

  const seerr = seerrInstances[0];
  const filtered = await apiJson(
    `/api/issues/unified?take=25&filter=open&instanceId=${encodeURIComponent(seerr.id)}`,
    cookies.header,
  );
  for (const item of filtered.results ?? []) {
    if (item.instanceId && item.instanceId !== seerr.id) {
      throw new Error("instance filter returned issues from another instance");
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (cookies.token) {
    await context.addCookies([
      { name: "umbrellarr_session", value: cookies.token, url: webBase },
    ]);
  }
  const page = await context.newPage();
  await page.goto(`${webBase}/issues`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/issues`, { waitUntil: "domcontentloaded" });
  }

  await page.waitForURL("**/issues", { timeout: 10_000 });
  await page.getByRole("textbox", { name: "Instance filter" }).waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "Open" }).waitFor();
  await page.getByRole("button", { name: "Most Recent" }).waitFor();

  await page.goto(`${webBase}/requests/${seerr.id}/issues`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(`**/issues?instance=${seerr.id}`, { timeout: 10_000 });

  const rows = page.locator("[data-issue-row]");
  const rowCount = await rows.count();
  if (rowCount > 0) {
    await rows.first().getByRole("button", { name: "View Issue" }).click();
    await page.waitForURL(`**/issues/${seerr.id}/**`, { timeout: 10_000 });
    await page.getByText("Issue detail is coming soon.").waitFor();
    console.log(`ui ok: ${rowCount} issue row(s), detail placeholder opens`);
  } else {
    await page.getByText("No issues match this filter.").waitFor();
    console.log("ui ok: issues empty state");
  }

  if (seerrInstances.length >= 2) {
    await page.goto(`${webBase}/issues`, { waitUntil: "domcontentloaded" });
    await page.getByRole("textbox", { name: "Instance filter" }).click();
    const other = seerrInstances.find((i) => i.id !== seerr.id) ?? seerrInstances[1];
    await page.getByRole("option", { name: other.name, exact: true }).click();
    await page.waitForURL(`**/issues?instance=${other.id}`, { timeout: 10_000 });
  }

  await browser.close();
  console.log("ui ok: unified issues page");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
