import assert from "node:assert/strict";
import {
  isImageContentType,
  isPublicHttpUrl,
  lidarrArtistCoverPath,
  lidarrArtistIdFromCoverPath,
  lidarrCoverPathCandidates,
  lidarrFallbackCoverApiPaths,
  pickLidarrGridImage,
  pickLidarrPosterRemoteUrl,
  toGridPosterPath,
  toGridPosterUrl,
  toLidarrCoverApiPath,
} from "./mediaCover.js";

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

assert.equal(
  toLidarrCoverApiPath("/MediaCover/1/poster.jpg"),
  "/api/v1/mediacover/artist/1/poster.jpg",
);
assert.equal(
  toLidarrCoverApiPath("/MediaCover/1/poster-500.jpg"),
  "/api/v1/mediacover/artist/1/poster.jpg",
);
assert.equal(
  toLidarrCoverApiPath("/MediaCover/Artist/12/poster.jpg"),
  "/api/v1/mediacover/artist/12/poster.jpg",
);
assert.equal(
  toLidarrCoverApiPath("/MediaCover/Album/9/cover.jpg"),
  "/api/v1/mediacover/album/9/cover.jpg",
);
assert.equal(
  toLidarrCoverApiPath("/api/v1/mediacover/artist/1/poster-500.jpg"),
  "/api/v1/mediacover/artist/1/poster.jpg",
);
assert.equal(
  lidarrArtistCoverPath(3, "/MediaCover/3/poster.jpg?lastWrite=1"),
  "/api/v1/mediacover/artist/3/poster.jpg",
);

assert.equal(isImageContentType("image/jpeg"), true);
assert.equal(isImageContentType("text/html; charset=utf-8"), false);
assert.equal(isImageContentType(null), true);

assert.deepEqual(lidarrCoverPathCandidates("/api/v1/mediacover/artist/75/poster.jpeg"), [
  "/api/v1/mediacover/artist/75/poster.jpg",
  "/api/v1/mediacover/artist/75/poster-250.jpg",
]);
assert.equal(lidarrArtistIdFromCoverPath("/api/v1/mediacover/artist/75/poster.jpeg"), 75);
assert.equal(
  pickLidarrGridImage([
    { coverType: "poster", url: "/MediaCover/75/poster.jpeg" },
    { coverType: "fanart", url: "/MediaCover/75/fanart.jpg" },
  ])?.url,
  "/MediaCover/75/fanart.jpg",
);
assert.deepEqual(
  lidarrFallbackCoverApiPaths(75, [
    { coverType: "poster", url: "/MediaCover/75/poster.jpeg" },
    { coverType: "fanart", url: "/MediaCover/75/fanart.jpg" },
  ]),
  ["/api/v1/mediacover/artist/75/fanart.jpg"],
);
assert.equal(
  pickLidarrPosterRemoteUrl([
    { coverType: "poster", remoteUrl: "https://assets.fanart.tv/a.jpeg" },
  ]),
  "https://assets.fanart.tv/a.jpeg",
);
assert.equal(isPublicHttpUrl("https://assets.fanart.tv/a.jpeg"), true);
assert.equal(isPublicHttpUrl("http://192.168.1.51/poster.jpeg"), false);

console.log("media cover tests passed");
