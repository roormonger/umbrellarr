import assert from "node:assert/strict";
import type { Instance } from "@umbrellarr/shared";
import { availabilityForArtist, mapLidarrArtist } from "./artists.js";

const lidarr: Instance = {
  id: "lidarr",
  name: "Lidarr",
  kind: "lidarr",
  baseUrl: "http://127.0.0.1:8686",
};

assert.equal(
  availabilityForArtist({
    monitored: false,
    statistics: { trackCount: 10, trackFileCount: 4 },
  }),
  "missingUnmonitored",
);
assert.equal(
  availabilityForArtist({
    monitored: true,
    status: "continuing",
    statistics: { trackCount: 10, trackFileCount: 10 },
  }),
  "continuing",
);
assert.equal(
  availabilityForArtist({
    monitored: true,
    statistics: { trackCount: 10, trackFileCount: 4 },
  }),
  "missingMonitored",
);
assert.equal(
  availabilityForArtist({
    monitored: true,
    status: "ended",
    statistics: { trackCount: 10, trackFileCount: 10 },
  }),
  "ended",
);
assert.equal(
  availabilityForArtist(
    {
      monitored: true,
      statistics: { trackCount: 10, trackFileCount: 4 },
    },
    true,
  ),
  "downloading",
);

const mapped = mapLidarrArtist(
  lidarr,
  {
    id: 7,
    artistName: "Test",
    monitored: true,
    images: [{ coverType: "poster", url: "/MediaCover/7/poster.jpg?lastWrite=1" }],
  },
  new Map(),
  new Map(),
  new Map(),
  new Set(),
);
assert.equal(
  mapped.posterUrl,
  `/api/media/lidarr/image?path=${encodeURIComponent("/api/v1/mediacover/artist/7/poster.jpg")}`,
);

const jpegPoster = mapLidarrArtist(
  lidarr,
  {
    id: 75,
    artistName: "Jpeg",
    monitored: true,
    images: [
      { coverType: "poster", url: "/MediaCover/75/poster.jpeg" },
      { coverType: "fanart", url: "/MediaCover/75/fanart.jpg" },
    ],
  },
  new Map(),
  new Map(),
  new Map(),
  new Set(),
);
assert.equal(
  jpegPoster.posterUrl,
  `/api/media/lidarr/image?path=${encodeURIComponent("/api/v1/mediacover/artist/75/fanart.jpg")}`,
);

console.log("artist availability tests passed");
