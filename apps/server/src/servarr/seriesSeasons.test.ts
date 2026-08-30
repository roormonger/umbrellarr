import assert from "node:assert/strict";
import { deriveSeriesEpisodeStatus } from "./seriesSeasons.js";

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

assert.equal(
  deriveSeriesEpisodeStatus({ hasFile: false, monitored: true, airDateUtc: past, downloading: true }),
  "downloading",
);
assert.equal(
  deriveSeriesEpisodeStatus({ hasFile: true, monitored: true, downloading: true }),
  "downloading",
);
assert.equal(deriveSeriesEpisodeStatus({ hasFile: true, monitored: true }), "downloaded");
assert.equal(deriveSeriesEpisodeStatus({ hasFile: true, monitored: false }), "downloaded");
assert.equal(deriveSeriesEpisodeStatus({ hasFile: false, monitored: false }), "unmonitored");
assert.equal(
  deriveSeriesEpisodeStatus({ hasFile: false, monitored: true, airDateUtc: future }),
  "unaired",
);
assert.equal(
  deriveSeriesEpisodeStatus({ hasFile: false, monitored: true, airDateUtc: past }),
  "missing",
);
assert.equal(deriveSeriesEpisodeStatus({ hasFile: false, monitored: true }), "missing");

console.log("series seasons status tests passed");
