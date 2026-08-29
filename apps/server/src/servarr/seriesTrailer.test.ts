import {
  clearSeriesTrailerCache,
  resolveSeriesYouTubeTrailerId,
} from "./seriesTrailer.js";

async function main() {
  clearSeriesTrailerCache();

  // Stranger Things — TMDb has English trailers
  const strangerThings = await resolveSeriesYouTubeTrailerId({ tmdbId: 66732 });
  if (!strangerThings) {
    throw new Error("Expected TMDb trailer for Stranger Things (tmdb 66732)");
  }
  console.log("tmdb stranger-things:", strangerThings);

  clearSeriesTrailerCache();

  // Breaking Bad — TMDb has no English trailers; TV Maze has a video page
  const breakingBad = await resolveSeriesYouTubeTrailerId({
    tmdbId: 1396,
    imdbId: "tt0903747",
    tvMazeId: 169,
  });
  if (!breakingBad) {
    throw new Error("Expected TV Maze fallback trailer for Breaking Bad");
  }
  console.log("tvmaze breaking-bad:", breakingBad);

  // Cache hit
  const cached = await resolveSeriesYouTubeTrailerId({
    tmdbId: 1396,
    imdbId: "tt0903747",
    tvMazeId: 169,
  });
  if (cached !== breakingBad) {
    throw new Error("Expected cached trailer id to match");
  }

  console.log("series trailer scrape tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
