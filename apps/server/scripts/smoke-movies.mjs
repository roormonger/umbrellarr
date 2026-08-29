import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: path.join(root, ".env") });

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const password = process.env.APP_PASSWORD;

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password }),
});

if (!login.ok) {
  console.error("login failed", login.status);
  process.exit(1);
}

const cookie =
  login.headers.getSetCookie?.()?.[0]?.split(";")[0] ??
  login.headers.get("set-cookie")?.split(";")[0];
const headers = cookie ? { Cookie: cookie } : {};

async function fetchMovies() {
  const started = performance.now();
  const res = await fetch(`${base}/api/movies`, { headers });
  const ms = Math.round(performance.now() - started);
  const payload = await res.json();
  return { res, payload, ms };
}

const first = await fetchMovies();
if (!first.res.ok) {
  console.error("movies failed", first.res.status, first.payload);
  process.exit(1);
}

const second = await fetchMovies();
const movies = first.payload.movies ?? [];
const withPoster = movies.filter((m) => m.posterUrl).length;
const sample = movies.slice(0, 3).map((m) => ({
  title: m.title,
  monitored: m.monitored,
  availability: m.availability,
  hasPoster: Boolean(m.posterUrl),
}));

console.log(
  JSON.stringify(
    {
      ok: true,
      count: movies.length,
      withPoster,
      sample,
      cache: {
        first: { status: first.res.headers.get("x-cache"), ms: first.ms, body: first.payload.cache },
        second: { status: second.res.headers.get("x-cache"), ms: second.ms, body: second.payload.cache },
      },
    },
    null,
    2,
  ),
);

if (movies[0]?.posterUrl?.startsWith("/api/media/")) {
  const img = await fetch(`${base}${movies[0].posterUrl}`, { headers });
  const bytes = Number(img.headers.get("content-length") ?? (await img.arrayBuffer()).byteLength);
  console.log(
    JSON.stringify({
      posterUrl: movies[0].posterUrl,
      imageStatus: img.status,
      contentType: img.headers.get("content-type"),
      cacheControl: img.headers.get("cache-control"),
      bytes,
      gridPoster: movies[0].posterUrl.includes("poster-500"),
    }),
  );
}

if (second.res.headers.get("x-cache") === "MISS") {
  console.error("expected second request to be HIT or STALE after warm cache");
  process.exit(1);
}
