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
  const sonarr = (instances.body.instances ?? []).find((i) => i.kind === "sonarr");
  if (!sonarr) throw new Error("No Sonarr instance configured");

  const lookup = await apiJson(
    `/api/shows/${encodeURIComponent(sonarr.id)}/lookup?term=friends`,
    cookies.header,
  );
  if (!lookup.res.ok) {
    throw new Error(`lookup failed ${lookup.res.status} ${JSON.stringify(lookup.body)}`);
  }
  const results = lookup.body.results ?? [];
  if (results.length < 1) throw new Error("expected friends lookup results");
  const inLib = results.find((m) => m.inLibrary && m.externalId);
  const missing = results.find((m) => !m.inLibrary && m.tvdbId && m.tvdbId !== inLib?.tvdbId);

  const options = await apiJson(
    `/api/shows/${encodeURIComponent(sonarr.id)}/options`,
    cookies.header,
  );
  if (!options.res.ok) throw new Error("options failed");
  const roots = options.body.rootFolders ?? [];
  const profiles = options.body.qualityProfiles ?? [];
  if (roots.length === 0 || profiles.length === 0) {
    throw new Error("expected root folders and quality profiles");
  }

  if (inLib) {
    const detail = await apiJson(
      `/api/shows/${encodeURIComponent(sonarr.id)}/${inLib.externalId}`,
      cookies.header,
    );
    if (!detail.res.ok) throw new Error("in-library detail failed");
  }

  if (missing && process.env.VERIFY_SERIES_ADD === "1") {
    const add = await apiJson(`/api/shows/${encodeURIComponent(sonarr.id)}`, cookies.header, {
      method: "POST",
      body: JSON.stringify({
        tvdbId: missing.tvdbId,
        qualityProfileId: profiles[0].id,
        rootFolderPath: roots[0].path.replace(/\/+$/, "") || "/",
        monitor: "none",
        seasonFolder: true,
        seriesType: missing.seriesType ?? "standard",
        tagIds: [],
        searchForMissingEpisodes: false,
        searchForCutoffUnmetEpisodes: false,
      }),
    });
    if (!add.res.ok) {
      throw new Error(`add failed ${add.res.status} ${JSON.stringify(add.body)}`);
    }
    const addedId = add.body.externalId;
    const del = await apiJson(
      `/api/shows/${encodeURIComponent(sonarr.id)}/${addedId}?deleteFiles=false`,
      cookies.header,
      { method: "DELETE" },
    );
    if (!del.res.ok) throw new Error(`cleanup delete failed ${del.res.status}`);
    console.log(`api add+remove ok: “${missing.title}”`);
  }

  console.log(
    `api ok: ${results.length} friends results` +
      (inLib ? `, in-library “${inLib.title}” id ${inLib.externalId}` : ""),
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (cookies.token) {
    await context.addCookies([
      { name: "umbrellarr_session", value: cookies.token, url: webBase },
    ]);
  }
  const page = await context.newPage();
  await page.goto(`${webBase}/shows/${sonarr.id}`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") && password) {
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.pathname.includes("/login"));
    await page.goto(`${webBase}/shows/${sonarr.id}`, { waitUntil: "domcontentloaded" });
  }

  await page.getByRole("button", { name: "Add New" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByPlaceholder("Search series…").fill("friends");
  await dialog.locator("[data-tvdb-id]").first().waitFor({ timeout: 20_000 });

  if (inLib) {
    await dialog.locator(`[data-tvdb-id="${inLib.tvdbId}"]`).click();
    await page.waitForURL(`**/shows/${sonarr.id}/${inLib.externalId}`, { timeout: 15_000 });
    await page.goto(`${webBase}/shows/${sonarr.id}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Add New" }).click();
  }

  const dialog2 = page.getByRole("dialog");
  await dialog2.waitFor();
  await dialog2.getByPlaceholder("Search series…").fill("friends");
  await dialog2.locator("[data-tvdb-id]").first().waitFor({ timeout: 20_000 });

  if (missing) {
    await dialog2.locator(`[data-tvdb-id="${missing.tvdbId}"]`).click();
    await dialog2.getByRole("button", { name: `Add ${missing.title}` }).waitFor({
      timeout: 15_000,
    });
    await dialog2.getByText("Start search for missing episodes").waitFor();
    await dialog2.getByLabel("Root folder").waitFor();
    await dialog2.getByLabel("Monitor").waitFor();
    await dialog2.getByRole("button", { name: "Back" }).click();
  }

  // Movie Arr layout smoke
  const radarr = (instances.body.instances ?? []).find((i) => i.kind === "radarr");
  if (radarr) {
    await page.goto(`${webBase}/movies/${radarr.id}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Add New" }).click();
    const movieDialog = page.getByRole("dialog");
    await movieDialog.waitFor();
    await movieDialog.getByPlaceholder("Search movies…").fill("rocky");
    await movieDialog.locator("[data-tmdb-id]").first().waitFor({ timeout: 20_000 });
    const missingMovie = (
      await (
        await fetch(
          `${apiBase}/api/movies/${encodeURIComponent(radarr.id)}/lookup?term=rocky`,
          { headers: { cookie: cookies.header } },
        )
      ).json()
    ).results?.find((m) => !m.inLibrary);
    if (missingMovie) {
      await movieDialog.locator(`[data-tmdb-id="${missingMovie.tmdbId}"]`).click();
      await movieDialog.getByRole("button", { name: `Add ${missingMovie.title}` }).waitFor({
        timeout: 15_000,
      });
      await movieDialog.getByText("subfolder will be created automatically").waitFor();
    }
  }

  await browser.close();
  console.log("ui ok: Shows Add New + Arr-style add form");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
