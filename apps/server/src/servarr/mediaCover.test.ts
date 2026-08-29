import assert from "node:assert/strict";
import { toGridPosterPath, toGridPosterUrl } from "./mediaCover.js";

assert.equal(toGridPosterPath("/MediaCover/1/poster.jpg"), "/MediaCover/1/poster-500.jpg");
assert.equal(toGridPosterPath("/MediaCover/1/poster-500.jpg"), "/MediaCover/1/poster-500.jpg");
assert.equal(toGridPosterPath("/MediaCover/1/fanart.jpg"), "/MediaCover/1/fanart.jpg");
assert.equal(
  toGridPosterUrl("/api/media/radarr/image?path=%2FMediaCover%2F1%2Fposter.jpg"),
  "/api/media/radarr/image?path=%2FMediaCover%2F1%2Fposter-500.jpg",
);
assert.equal(
  toGridPosterUrl("/api/media/radarr/image?path=%2FMediaCover%2F1%2Fposter-500.jpg"),
  "/api/media/radarr/image?path=%2FMediaCover%2F1%2Fposter-500.jpg",
);

console.log("media cover tests passed");
