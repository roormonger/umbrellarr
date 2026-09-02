import { chromium } from "playwright";



const webBase = process.env.VERIFY_WEB_BASE ?? "http://localhost:5173";

const apiBase = process.env.VERIFY_API_BASE ?? "http://localhost:3000";

const password = process.env.APP_PASSWORD;



const KIND_LINKS = {
  radarr: ["movies"],
  sonarr: ["shows"],
  lidarr: ["music"],
  seerr: ["requests", "issues"],
};



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



  await page.locator("[data-sidebar-header]").waitFor();

  const activity = page.locator("[data-sidebar-header], .mantine-AppShell-navbar").getByText(

    "Activity",

    { exact: true },

  );

  if ((await activity.count()) > 0) {

    throw new Error("Activity section should not be in the sidebar");

  }

  if ((await page.locator("[data-nav-section]").count()) > 0) {

    throw new Error("sidebar should not have section headers");

  }

  await page.locator('[data-nav-link="queue"]').waitFor();

  await page.locator('[data-nav-link="history"]').waitFor();

  await page.locator('[data-nav-link="calendar"]').waitFor();

  await page.locator('[data-nav-link="settings"]').waitFor();



  for (const link of ["movies-queue", "shows-queue", "music-queue", "movies-history", "shows-history", "music-history", "movies-collections"]) {

    if ((await page.locator(`[data-nav-link="${link}"]`).count()) > 0) {

      throw new Error(`per-section queue link ${link} should not be in sidebar`);

    }

  }



  const kinds = [...new Set(instances.map((i) => i.kind))];

  for (const kind of kinds) {

    const links = KIND_LINKS[kind];

    if (!links) continue;

    for (const link of links) {

      await page.locator(`[data-nav-link="${link}"]`).waitFor({ timeout: 10_000 });

    }

  }



  const labelOf = async (navLink) =>

    (await page.locator(`[data-nav-link="${navLink}"]`).innerText()).trim();

  const expectedLabels = {
    movies: "Movies",
    shows: "Shows",
    music: "Music",
    requests: "Requests",
    issues: "Issues",
    queue: "Queue",
    history: "History",
    calendar: "Calendar",
    settings: "Settings",
  };

  for (const [navLink, label] of Object.entries(expectedLabels)) {

    if (!(await page.locator(`[data-nav-link="${navLink}"]`).count())) continue;

    const actual = await labelOf(navLink);

    if (actual !== label) {

      throw new Error(`expected ${navLink} label "${label}", got "${actual}"`);

    }

  }



  const navbar = page.locator(".mantine-AppShell-navbar");

  for (const instance of instances) {

    const named = navbar.getByRole("button", { name: instance.name, exact: true });

    if ((await named.count()) > 0) {

      throw new Error(`sidebar should not list instance "${instance.name}"`);

    }

  }



  await page.locator('[data-nav-link="queue"]').click();

  await page.waitForURL("**/activity/queue", { timeout: 10_000 });

  await page.getByRole("columnheader", { name: "Title" }).waitFor();

  await page.locator('[data-nav-link="history"]').click();

  await page.waitForURL("**/activity/history", { timeout: 10_000 });

  await page.getByRole("columnheader", { name: "Date" }).waitFor();

  await page.locator('[data-nav-link="requests"]').click();

  await page.waitForURL("**/requests", { timeout: 10_000 });

  await page.getByRole("textbox", { name: "Instance filter" }).waitFor();



  const radarr = instances.find((i) => i.kind === "radarr");

  if (radarr) {

    await page.goto(`${webBase}/movies/${radarr.id}/queue`, { waitUntil: "domcontentloaded" });

    await page.waitForURL(`**/activity/queue?instance=${radarr.id}`, { timeout: 10_000 });

    await page.locator('[data-nav-link="movies"]').click();

    await page.waitForURL("**/movies", { timeout: 10_000 });

    if (page.url().includes("/collections") || page.url().includes("/queue")) {

      throw new Error(`Movies click did not open library page: ${page.url()}`);

    }

    const parsed = new URL(page.url());

    if (parsed.pathname !== "/movies") {

      throw new Error(`Movies nav should open /movies, got ${parsed.pathname}`);

    }



    const radarrs = instances.filter((i) => i.kind === "radarr");

    const picker = page.getByRole("textbox", { name: "Instance filter" });

    if (radarrs.length < 2) {

      const value = await picker.inputValue();

      if (value !== "All instances") {

        throw new Error("Instance filter should default to All instances for a single Radarr");

      }

    } else {

      await picker.waitFor({ timeout: 10_000 });

      const other = radarrs.find((i) => i.id !== radarr.id) ?? radarrs[1];

      await picker.click();

      await page.getByRole("option", { name: other.name, exact: true }).click();

      await page.waitForURL(`**/movies?instance=${other.id}`, { timeout: 10_000 });

    }

  }



  const seerr = instances.find((i) => i.kind === "seerr");

  if (seerr) {

    await page.locator('[data-nav-link="issues"]').click();

    await page.waitForURL("**/issues", { timeout: 10_000 });

    await page.getByRole("textbox", { name: "Instance filter" }).waitFor();

  }



  await browser.close();

  console.log(`ui ok: static sidebar links for ${instances.length} instance(s)`);

}



main().catch((error) => {

  console.error(error);

  process.exit(1);

});


