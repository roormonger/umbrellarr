/**
 * Resolve TMDb / IMDb ratings for a Sonarr series.
 *
 * Prefer values Sonarr already returned; scrape Sonarr-linked TMDb/IMDb pages
 * only to fill gaps. Results are cached in memory. IMDb is often bot-blocked —
 * fail soft.
 */

const FETCH_TIMEOUT_MS = 8_000;
const HIT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 6 * 60 * 60 * 1000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type SeriesRatingIds = {
  tmdbId?: number;
  imdbId?: string;
};

export type SeriesRatings = {
  tmdbRating?: number;
  imdbRating?: number;
};

type CacheEntry = { value: number | null; expiresAt: number };

const tmdbCache = new Map<string, CacheEntry>();
const imdbCache = new Map<string, CacheEntry>();

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

function normalizeRating(value: number): number | undefined {
  if (!Number.isFinite(value) || value <= 0 || value > 10) return undefined;
  return Math.round(value * 10) / 10;
}

function parseCached(
  cache: Map<string, CacheEntry>,
  key: string,
): { hit: boolean; value?: number } {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return { hit: false };
  return { hit: true, value: entry.value ?? undefined };
}

function writeCache(
  cache: Map<string, CacheEntry>,
  key: string,
  value: number | undefined,
): void {
  cache.set(key, {
    value: value ?? null,
    expiresAt: Date.now() + (value != null ? HIT_TTL_MS : MISS_TTL_MS),
  });
}

/** TMDb TV page — JSON-LD ratingValue or user_score_chart data-percent. */
async function scrapeTmdbRating(tmdbId: number): Promise<number | undefined> {
  const key = `tmdb:${tmdbId}`;
  const cached = parseCached(tmdbCache, key);
  if (cached.hit) return cached.value;

  const html = await fetchHtml(`https://www.themoviedb.org/tv/${tmdbId}`);
  if (!html) {
    writeCache(tmdbCache, key, undefined);
    return undefined;
  }

  let found: number | undefined;
  const jsonLd = html.match(
    /"@type"\s*:\s*"aggregateRating"[^}]*"ratingValue"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
  );
  if (jsonLd?.[1]) {
    found = normalizeRating(Number(jsonLd[1]));
  }

  if (found == null) {
    const percent = html.match(/user_score_chart"[^>]*data-percent="([0-9]+)"/i);
    if (percent?.[1]) {
      found = normalizeRating(Number(percent[1]) / 10);
    }
  }

  if (found == null) {
    const itemprop = html.match(
      /itemprop=["']ratingValue["'][^>]*content=["']([0-9]+(?:\.[0-9]+)?)["']/i,
    );
    if (itemprop?.[1]) {
      found = normalizeRating(Number(itemprop[1]));
    }
  }

  writeCache(tmdbCache, key, found);
  return found;
}

/** IMDb title page — often blocked; parse aggregateRating when available. */
async function scrapeImdbRating(imdbId: string): Promise<number | undefined> {
  const key = `imdb:${imdbId}`;
  const cached = parseCached(imdbCache, key);
  if (cached.hit) return cached.value;

  const html = await fetchHtml(`https://www.imdb.com/title/${imdbId}/`);
  if (!html) {
    writeCache(imdbCache, key, undefined);
    return undefined;
  }

  let found: number | undefined;
  const patterns = [
    /"aggregateRating"\s*:\s*\{[^}]*"ratingValue"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?/i,
    /"ratingValue"\s*:\s*"([0-9]+(?:\.[0-9]+)?)"/i,
    /itemprop=["']ratingValue["'][^>]*content=["']([0-9]+(?:\.[0-9]+)?)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      found = normalizeRating(Number(match[1]));
      if (found != null) break;
    }
  }

  writeCache(imdbCache, key, found);
  return found;
}

/**
 * Resolve TMDb/IMDb ratings. Existing Arr values win; scrape only fills gaps.
 */
export async function resolveSeriesRatings(
  ids: SeriesRatingIds,
  existing?: SeriesRatings,
): Promise<SeriesRatings> {
  const result: SeriesRatings = {};

  if (existing?.tmdbRating != null) {
    result.tmdbRating = normalizeRating(existing.tmdbRating);
  } else if (ids.tmdbId != null) {
    const scraped = await scrapeTmdbRating(ids.tmdbId);
    if (scraped != null) result.tmdbRating = scraped;
  }

  if (existing?.imdbRating != null) {
    result.imdbRating = normalizeRating(existing.imdbRating);
  } else if (ids.imdbId) {
    const scraped = await scrapeImdbRating(ids.imdbId);
    if (scraped != null) result.imdbRating = scraped;
  }

  return result;
}

/** Test helper — clears the in-memory ratings caches. */
export function clearSeriesRatingsCache(): void {
  tmdbCache.clear();
  imdbCache.clear();
}
