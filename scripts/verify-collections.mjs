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

async function apiJson(path, cookie, init) {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { cookie, ...(init?.body ? { "content-type": "application/json" } : {}) },
    ...init,
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function main() {
  const cookies = await loginCookies();
  const instances = await apiJson("/api/instances", cookies.header);
  const radarr = (instances.body.instances ?? []).find((i) => i.kind === "radarr");
  if (!radarr) throw new Error("No Radarr instance configured");

  const list = await apiJson(
    `/api/collections?instanceId=${encodeURIComponent(radarr.id)}`,
    cookies.header,
  );
  if (!list.res.ok) {
    throw new Error(`collections list failed ${list.res.status} ${JSON.stringify(list.body)}`);
  }
  const collections = list.body.collections ?? [];
  if (!Array.isArray(collections) || collections.length === 0) {
    throw new Error("expected at least one Radarr collection");
  }
  const sample = collections[0];
  if (!sample.externalId || !sample.title || !Array.isArray(sample.movies)) {
    throw new Error(`malformed collection ${JSON.stringify(sample)}`);
  }

  const options = await apiJson(
    `/api/collections/${encodeURIComponent(radarr.id)}/options`,
    cookies.header,
  );
  if (!options.res.ok) {
    throw new Error(`options failed ${options.res.status} ${JSON.stringify(options.body)}`);
  }
  if (!Array.isArray(options.body.qualityProfiles) || !Array.isArray(options.body.rootFolders)) {
    throw new Error("options missing qualityProfiles/rootFolders");
  }

  const refresh = await apiJson(
    `/api/collections/${encodeURIComponent(radarr.id)}/refresh`,
    cookies.header,
    { method: "POST" },
  );
  if (!refresh.res.ok) {
    throw new Error(`refresh failed ${refresh.res.status} ${JSON.stringify(refresh.body)}`);
  }

  console.log(`api ok: ${collections.length} collections, refresh ${refresh.res.status}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (cookies.token) {
    await context.addCookies([
      { name: "umbrellarr_session", value: cookies.token, url: webBase },
    ]);
  }
  const page = await context.newPage();
  const collectionsUrl = `${webBase}/movies/${encodeURIComponent(radarr.id)}/collections`;
  await page.goto(collectionsUrl, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(collectionsUrl, { waitUntil: "domcontentloaded" });
  }

  await page.locator("[data-collection-row]").first().waitFor({ timeout: 20_000 });
  const update = page.getByRole("button", { name: "Update Selected" });
  await update.waitFor();
  if (await update.isEnabled()) {
    throw new Error("Update Selected should be disabled with no selection");
  }

  await page.locator("[data-collection-row]").first().getByRole("checkbox").click();
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll("button")].find((el) =>
      el.textContent?.includes("Update Selected"),
    );
    return btn && !btn.disabled;
  });

  const existingPoster = page.locator("[data-collection-poster][data-existing=true]").first();
  await existingPoster.waitFor({ timeout: 15_000 });
  await existingPoster.click();
  await page.waitForURL(/\/movies\/[^/]+\/\d+/, { timeout: 15_000 });
  await page.getByRole("button", { name: "Back" }).click();
  await page.waitForURL(/\/movies\/[^/]+\/collections\/?$/, { timeout: 15_000 });
  await page.locator("[data-collection-row]").first().waitFor({ timeout: 20_000 });

  await page.goto(collectionsUrl, { waitUntil: "domcontentloaded" });
  await page.locator("[data-collection-row]").first().waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "Refresh Collections" }).click();
  await page.getByText("Collections refresh queued in Radarr").waitFor({ timeout: 20_000 });

  await browser.close();
  console.log("ui ok: rows, Update Selected enables, poster → detail, refresh");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
