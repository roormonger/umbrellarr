import {
  clearSeriesRatingsCache,
  resolveSeriesRatings,
} from "./seriesRatings.js";

async function main() {
  clearSeriesRatingsCache();

  const scraped = await resolveSeriesRatings({
    tmdbId: 218510,
    imdbId: "tt18566094",
  });
  if (scraped.tmdbRating == null) {
    throw new Error("Expected TMDb rating for Happy Family USA (tmdb 218510)");
  }
  console.log("scraped", scraped);

  // Prefer Arr values — scrape must not overwrite
  clearSeriesRatingsCache();
  const preferred = await resolveSeriesRatings(
    { tmdbId: 218510, imdbId: "tt18566094" },
    { tmdbRating: 9.1, imdbRating: 8.8 },
  );
  if (preferred.tmdbRating !== 9.1 || preferred.imdbRating !== 8.8) {
    throw new Error(`Expected Arr values preserved, got ${JSON.stringify(preferred)}`);
  }
  console.log("preferred", preferred);

  console.log("series ratings scrape tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
