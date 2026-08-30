import assert from "node:assert/strict";
import {
  artistPosterStatus,
  moviePosterStatus,
  seriesPosterStatus,
} from "./posterStatus.js";

assert.equal(
  moviePosterStatus({ hasFile: true, monitored: true, isAvailable: true }),
  "downloaded",
);
assert.equal(
  moviePosterStatus({ hasFile: true, monitored: false, isAvailable: true }),
  "downloadedUnmonitored",
);
assert.equal(
  moviePosterStatus({ hasFile: false, monitored: true, isAvailable: true }),
  "missingMonitored",
);
assert.equal(
  moviePosterStatus({ hasFile: false, monitored: false, isAvailable: true }),
  "missingUnmonitored",
);
assert.equal(
  moviePosterStatus({ hasFile: false, monitored: true, isAvailable: false }),
  "unreleased",
);
assert.equal(
  moviePosterStatus({
    hasFile: false,
    monitored: true,
    isAvailable: true,
    downloading: true,
  }),
  "queued",
);

assert.equal(
  seriesPosterStatus({
    monitored: true,
    status: "continuing",
    episodeCount: 10,
    episodeFileCount: 10,
  }),
  "continuing",
);
assert.equal(
  seriesPosterStatus({
    monitored: true,
    status: "ended",
    episodeCount: 10,
    episodeFileCount: 10,
  }),
  "ended",
);
assert.equal(
  seriesPosterStatus({
    monitored: true,
    episodeCount: 10,
    episodeFileCount: 4,
  }),
  "missingMonitored",
);
assert.equal(
  seriesPosterStatus({
    monitored: false,
    episodeCount: 10,
    episodeFileCount: 4,
  }),
  "missingUnmonitored",
);
assert.equal(
  seriesPosterStatus({
    monitored: true,
    episodeCount: 10,
    episodeFileCount: 4,
    downloading: true,
  }),
  "downloading",
);

assert.equal(
  artistPosterStatus({
    monitored: true,
    status: "continuing",
    trackCount: 10,
    trackFileCount: 10,
  }),
  "continuing",
);
assert.equal(
  artistPosterStatus({
    monitored: false,
    trackCount: 10,
    trackFileCount: 2,
  }),
  "missingUnmonitored",
);

console.log("poster status tests passed");
