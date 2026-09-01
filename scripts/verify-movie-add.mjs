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
  const body = text ? JSON.parse(text) : null;
  return { res, body };
}

async function main() {
  const cookies = await loginCookies();
  const instances = await apiJson("/api/instances", cookies.header);
  const radarr = (instances.body.instances ?? []).find((i) => i.kind === "radarr");
  if (!radarr) throw new Error("No Radarr instance configured");

  const lookup = await apiJson(
    `/api/movies/${encodeURIComponent(radarr.id)}/lookup?term=rocky`,
    cookies.header,
  );
  if (!lookup.res.ok) {
    throw new Error(`lookup failed ${lookup.res.status} ${JSON.stringify(lookup.body)}`);
  }
  const results = lookup.body.results ?? [];
  if (results.length < 3) {
    throw new Error(`expected several rocky results, got ${results.length}`);
  }
  const inLib = results.find((m) => m.inLibrary && m.externalId);
  const missing = results.find((m) => !m.inLibrary && m.tmdbId && m.tmdbId !== inLib?.tmdbId);
  if (!inLib) throw new Error("expected at least one in-library rocky result");
  if (!results.some((m) => m.posterUrl)) throw new Error("expected lookup posters");
  if (!results.some((m) => m.overview)) throw new Error("expected lookup overviews");

  const options = await apiJson(
    `/api/movies/${encodeURIComponent(radarr.id)}/options`,
    cookies.header,
  );
  if (!options.res.ok) throw new Error("options failed");
  const roots = options.body.rootFolders ?? [];
  const profiles = options.body.qualityProfiles ?? [];
  if (roots.length === 0 || profiles.length === 0) {
    throw new Error("expected root folders and quality profiles");
  }
  if (roots.some((r) => typeof r.freeSpace !== "number")) {
    console.warn("warning: some roots missing freeSpace");
  }

  const detail = await apiJson(
    `/api/movies/${encodeURIComponent(radarr.id)}/${inLib.externalId}`,
    cookies.header,
  );
  if (!detail.res.ok || detail.body.title !== inLib.title) {
    throw new Error("in-library lookup id did not match movie detail");
  }

  let addedId;
  if (missing) {
    const add = await apiJson(`/api/movies/${encodeURIComponent(radarr.id)}`, cookies.header, {
      method: "POST",
      body: JSON.stringify({
        tmdbId: missing.tmdbId,
        qualityProfileId: profiles[0].id,
        rootFolderPath: roots[0].path.replace(/\/+$/, "") || "/",
        monitored: false,
        minimumAvailability: "released",
        tagIds: [],
        searchForMovie: false,
      }),
    });
    if (!add.res.ok) {
      throw new Error(`add failed ${add.res.status} ${JSON.stringify(add.body)}`);
    }
    addedId = add.body.externalId;
    if (!addedId) throw new Error("add did not return externalId");
    const added = await apiJson(
      `/api/movies/${encodeURIComponent(radarr.id)}/${addedId}`,
      cookies.header,
    );
    if (!added.res.ok) throw new Error("added movie detail missing");
    const del = await apiJson(
      `/api/movies/${encodeURIComponent(radarr.id)}/${addedId}?deleteFiles=false`,
      cookies.header,
      { method: "DELETE" },
    );
    if (!del.res.ok) throw new Error(`cleanup delete failed ${del.res.status}`);
  } else {
    console.warn("no missing rocky title — skipped add/delete");
  }

  console.log(
    `api ok: ${results.length} rocky results, in-library “${inLib.title}” id ${inLib.externalId}` +
      (missing ? `, added+removed “${missing.title}”` : ""),
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (cookies.token) {
    await context.addCookies([
      { name: "umbrellarr_session", value: cookies.token, url: webBase },
    ]);
  }
  const page = await context.newPage();
  await page.goto(`${webBase}/movies/${radarr.id}`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/movies/${radarr.id}`, { waitUntil: "domcontentloaded" });
  }

  await page.getByRole("button", { name: "Add New" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByPlaceholder("Search movies…").fill("rocky");
  await dialog.locator(`[data-tmdb-id="${inLib.tmdbId}"]`).waitFor({ timeout: 20_000 });
  await dialog.getByText("In Library").first().waitFor();

  await dialog.locator(`[data-tmdb-id="${inLib.tmdbId}"]`).click();
  await page.waitForURL(`**/movies/${radarr.id}/${inLib.externalId}`, { timeout: 15_000 });

  await page.goto(`${webBase}/movies/${radarr.id}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add New" }).click();
  const dialog2 = page.getByRole("dialog");
  await dialog2.waitFor();
  await dialog2.getByPlaceholder("Search movies…").fill("rocky");
  await dialog2.locator(`[data-tmdb-id="${inLib.tmdbId}"]`).waitFor({ timeout: 20_000 });

  if (missing) {
    await dialog2.locator(`[data-tmdb-id="${missing.tmdbId}"]`).click();
    await dialog2.getByRole("button", { name: "Add Movie" }).waitFor({ timeout: 15_000 });
    await dialog2.getByText("Start search for missing movie").waitFor();
    await dialog2.getByLabel("Root folder").waitFor();
    await dialog2.getByRole("button", { name: "Back" }).click();
    await dialog2.getByPlaceholder("Search movies…").waitFor();
  }

  await browser.close();
  console.log(`ui ok: Add New → rocky → in-library detail /movies/${radarr.id}/${inLib.externalId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
