/**
 * Resolve a YouTube trailer ID for a Sonarr series.
 *
 * Sonarr does not store youTubeTrailerId (unlike Radarr). With explicit product
 * approval we scrape the same external pages Sonarr’s UI already links to, in
 * order: TMDb → IMDb → TV Maze. Results are cached in memory.
 */

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const FETCH_TIMEOUT_MS = 8_000;
const HIT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 6 * 60 * 60 * 1000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type SeriesTrailerIds = {
  tmdbId?: number;
  imdbId?: string;
  tvMazeId?: number;
};

type CacheEntry = { id: string | null; expiresAt: number };

const cache = new Map<string, CacheEntry>();

function cacheKey(ids: SeriesTrailerIds): string {
  return [
    ids.tmdbId != null ? `tmdb:${ids.tmdbId}` : "",
    ids.imdbId ? `imdb:${ids.imdbId}` : "",
    ids.tvMazeId != null ? `tvmaze:${ids.tvMazeId}` : "",
  ]
    .filter(Boolean)
    .join("|");
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function preferTrailerId(
  candidates: Array<{ id: string; title?: string }>,
): string | undefined {
  if (candidates.length === 0) return undefined;
  const scored = candidates.map((c) => {
    const title = (c.title ?? "").toLowerCase();
    let score = 0;
    if (title.includes("trailer")) score += 40;
    if (title.includes("official")) score += 20;
    if (title.includes("teaser")) score -= 10;
    if (title.includes("clip")) score -= 15;
    return { id: c.id, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id;
}

/** TMDb TV videos page — `play_trailer` anchors with data-id / data-title. */
async function scrapeTmdb(tmdbId: number): Promise<string | undefined> {
  const html = await fetchHtml(`https://www.themoviedb.org/tv/${tmdbId}/videos`);
  if (!html) return undefined;

  const candidates: Array<{ id: string; title?: string }> = [];
  const playRe =
    /class="[^"]*play_trailer[^"]*"[^>]*data-site="YouTube"[^>]*data-id="([A-Za-z0-9_-]{11})"[^>]*data-title="([^"]*)"/gi;
  for (const match of html.matchAll(playRe)) {
    const id = match[1];
    if (id && YOUTUBE_ID_RE.test(id)) {
      candidates.push({ id, title: match[2] });
    }
  }

  if (candidates.length === 0) {
    // Attribute order sometimes differs
    const altRe =
      /data-id="([A-Za-z0-9_-]{11})"[^>]*data-site="YouTube"[^>]*data-title="([^"]*)"/gi;
    for (const match of html.matchAll(altRe)) {
      const id = match[1];
      if (id && YOUTUBE_ID_RE.test(id)) {
        candidates.push({ id, title: match[2] });
      }
    }
  }

  if (candidates.length === 0) {
    for (const match of html.matchAll(
      /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/gi,
    )) {
      const id = match[1];
      if (id && YOUTUBE_ID_RE.test(id)) candidates.push({ id });
    }
  }

  return preferTrailerId(candidates);
}

/** IMDb title page — often bot-blocked; best-effort only. */
async function scrapeImdb(imdbId: string): Promise<string | undefined> {
  const html = await fetchHtml(`https://www.imdb.com/title/${imdbId}/`);
  if (!html) return undefined;

  const candidates: Array<{ id: string; title?: string }> = [];
  for (const match of html.matchAll(
    /(?:youtube\.com\/(?:embed|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/gi,
  )) {
    const id = match[1];
    if (id && YOUTUBE_ID_RE.test(id)) candidates.push({ id });
  }
  for (const match of html.matchAll(
    /"embedUrl"\s*:\s*"https?:\/\/www\.youtube\.com\/embed\/([A-Za-z0-9_-]{11})"/gi,
  )) {
    const id = match[1];
    if (id && YOUTUBE_ID_RE.test(id)) candidates.push({ id, title: "trailer" });
  }
  return preferTrailerId(candidates);
}

/** TV Maze show page → first /videos/…trailer page → YouTube iframe. */
async function scrapeTvMaze(tvMazeId: number): Promise<string | undefined> {
  const showHtml = await fetchHtml(`https://www.tvmaze.com/shows/${tvMazeId}/_`);
  if (!showHtml) return undefined;

  const videoPaths = [
    ...showHtml.matchAll(/href="(\/videos\/\d+\/[^"]*trailer[^"]*)"/gi),
  ].map((m) => m[1]);

  const uniquePaths = [...new Set(videoPaths.filter(Boolean))] as string[];
  for (const path of uniquePaths.slice(0, 3)) {
    const html = await fetchHtml(`https://www.tvmaze.com${path}`);
    if (!html) continue;
    const embed = html.match(
      /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/i,
    )?.[1];
    if (embed && YOUTUBE_ID_RE.test(embed)) return embed;
  }
  return undefined;
}

/**
 * Resolve a YouTube trailer id from Sonarr-provided external IDs.
 * Returns undefined when nothing can be found (including cache misses).
 */
export async function resolveSeriesYouTubeTrailerId(
  ids: SeriesTrailerIds,
  existing?: string,
): Promise<string | undefined> {
  if (existing && YOUTUBE_ID_RE.test(existing)) return existing;

  const key = cacheKey(ids);
  if (!key) return undefined;

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.id ?? undefined;
  }

  let found: string | undefined;
  if (ids.tmdbId != null) {
    found = await scrapeTmdb(ids.tmdbId);
  }
  if (!found && ids.imdbId) {
    found = await scrapeImdb(ids.imdbId);
  }
  if (!found && ids.tvMazeId != null) {
    found = await scrapeTvMaze(ids.tvMazeId);
  }

  cache.set(key, {
    id: found ?? null,
    expiresAt: Date.now() + (found ? HIT_TTL_MS : MISS_TTL_MS),
  });
  return found;
}

/** Test helper — clears the in-memory trailer cache. */
export function clearSeriesTrailerCache(): void {
  cache.clear();
}
