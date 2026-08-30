import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupAlbumsByType } from "./artistAlbums.js";

describe("groupAlbumsByType", () => {
  it("orders by artist albumTypes then discovery, Other last", () => {
    const groups = groupAlbumsByType(
      [
        {
          id: 1,
          title: "A",
          albumType: "Single",
          monitored: true,
          releaseDate: "2020-01-01",
          statistics: {},
        },
        {
          id: 2,
          title: "B",
          albumType: "Album",
          monitored: true,
          releaseDate: "2021-01-01",
          statistics: {},
        },
        {
          id: 3,
          title: "C",
          albumType: "Other",
          monitored: false,
          statistics: {},
        },
        {
          id: 4,
          title: "D",
          albumType: "EP",
          monitored: true,
          releaseDate: "2019-06-01",
          statistics: {},
        },
      ],
      ["Album", "EP", "Single"],
    );
    assert.deepEqual(
      groups.map((g) => g.albumType),
      ["Album", "EP", "Single", "Other"],
    );
    assert.equal(groups[0]?.albums[0]?.title, "B");
  });

  it("sorts albums within a type by release date descending", () => {
    const groups = groupAlbumsByType(
      [
        {
          id: 1,
          title: "Old",
          albumType: "Album",
          monitored: true,
          releaseDate: "2010-01-01",
          statistics: {},
        },
        {
          id: 2,
          title: "New",
          albumType: "Album",
          monitored: true,
          releaseDate: "2020-01-01",
          statistics: {},
        },
      ],
      ["Album"],
    );
    assert.deepEqual(
      groups[0]?.albums.map((a) => a.title),
      ["New", "Old"],
    );
  });
});
