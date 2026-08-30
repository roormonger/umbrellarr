import assert from "node:assert/strict";
import { albumTrackCountKind, albumTypeStats } from "./albumTrackCountKind.ts";

function album(partial: {
  id: number;
  title: string;
  monitored?: boolean;
  statistics?: {
    trackFileCount?: number;
    trackCount?: number;
    totalTrackCount?: number;
    sizeOnDisk?: number;
  };
}) {
  return {
    albumType: "Album",
    monitored: true,
    statistics: {},
    ...partial,
  };
}

assert.equal(
  albumTrackCountKind(
    album({
      id: 1,
      title: "complete",
      monitored: true,
      statistics: { trackFileCount: 10, trackCount: 10, totalTrackCount: 10 },
    }),
  ),
  "complete",
);

assert.equal(
  albumTrackCountKind(
    album({
      id: 2,
      title: "unmonitored missing",
      monitored: false,
      statistics: { trackFileCount: 0, trackCount: 8, totalTrackCount: 8 },
    }),
  ),
  "unmonitored",
);

assert.equal(
  albumTrackCountKind(
    album({
      id: 3,
      title: "missing",
      monitored: true,
      statistics: { trackFileCount: 2, trackCount: 10, totalTrackCount: 10 },
    }),
  ),
  "missing",
);

const stats = albumTypeStats([
  album({
    id: 1,
    title: "a",
    monitored: true,
    statistics: { trackFileCount: 10, trackCount: 10, totalTrackCount: 10, sizeOnDisk: 100 },
  }),
  album({
    id: 2,
    title: "b",
    monitored: true,
    statistics: { trackFileCount: 0, trackCount: 4, totalTrackCount: 4, sizeOnDisk: 0 },
  }),
]);
assert.equal(stats.trackFileCount, 10);
assert.equal(stats.trackCount, 14);
assert.equal(stats.sizeOnDisk, 100);
assert.equal(stats.kind, "missing");

console.log("albumTrackCountKind tests passed");
