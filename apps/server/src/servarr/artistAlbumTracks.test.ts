import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Instance } from "@umbrellarr/shared";
import { buildArtistAlbumTracksResponse } from "./artistAlbumTracks.js";

const lidarr: Instance = {
  id: "lidarr",
  name: "Lidarr",
  kind: "lidarr",
  baseUrl: "http://127.0.0.1:8686",
};

describe("buildArtistAlbumTracksResponse", () => {
  it("groups discs, joins files, and only copies Arr detail fields", () => {
    const payload = buildArtistAlbumTracksResponse(
      lidarr,
      7,
      {
        id: 42,
        artistId: 7,
        title: "Live at Woodstock",
        albumType: "Album",
        releaseDate: "2019-08-02",
        monitored: true,
        foreignAlbumId: "mb-album",
        ratings: { value: 8.2 },
        statistics: { trackCount: 3, trackFileCount: 2, sizeOnDisk: 1000 },
        images: [{ coverType: "cover", url: "/MediaCover/Album/42/cover.jpg" }],
        artist: { artistName: "Creedence Clearwater Revival", foreignArtistId: "mb-artist" },
        releases: [
          {
            foreignReleaseId: "mb-release",
            status: "Official",
            country: ["United States"],
            label: "Fantasy",
            media: [{ mediumNumber: 1 }, { number: 2 }],
          },
        ],
      },
      [
        {
          id: 1,
          trackFileId: 11,
          title: "Born on the Bayou",
          duration: 321000,
          trackNumber: "1",
          absoluteTrackNumber: 1,
          mediumNumber: 1,
          hasFile: true,
          foreignTrackId: "mb-track-1",
          foreignRecordingId: "mb-rec-1",
        },
        {
          id: 2,
          title: "Green River",
          duration: 154000,
          trackNumber: "2",
          absoluteTrackNumber: 2,
          mediumNumber: 2,
          hasFile: false,
        },
        {
          id: 3,
          trackFileId: 13,
          title: "Bad Moon Rising",
          duration: 141000,
          trackNumber: "3",
          absoluteTrackNumber: 3,
          mediumNumber: 2,
          hasFile: true,
          foreignTrackId: "mb-track-3",
        },
      ],
      [
        {
          id: 11,
          path: "C:\\music\\CCR\\01.mp3",
          relativePath: "01.mp3",
          quality: { quality: { name: "MP3-128" } },
          mediaInfo: {
            audioCodec: "MP3",
            audioBitrate: 128000,
            audioSampleRate: 44100,
          },
        },
        {
          id: 13,
          relativePath: "03.mp3",
          quality: { quality: { name: "FLAC" } },
        },
      ],
    );

    assert.equal(payload.artistName, "Creedence Clearwater Revival");
    assert.equal(payload.album.title, "Live at Woodstock");
    assert.match(payload.album.coverUrl ?? "", /mediacover%2Falbum%2F42%2Fcover\.jpg/i);
    assert.equal(payload.tracks.length, 3);
    assert.deepEqual(
      payload.tracks.map((t) => [t.mediumNumber, t.title, t.hasFile]),
      [
        [1, "Born on the Bayou", true],
        [2, "Green River", false],
        [2, "Bad Moon Rising", true],
      ],
    );

    const first = payload.tracks[0];
    assert.equal(first?.trackFileId, 11);
    assert.equal(first?.audioInfo, "MP3 · 128 kbps · 44.1 kHz");
    assert.equal(first?.status, "MP3-128");
    assert.equal(first?.country, "United States");
    assert.equal(first?.label, "Fantasy");
    assert.equal(first?.year, 2019);
    assert.equal(first?.mediumCount, 2);
    assert.equal(first?.foreignArtistId, "mb-artist");
    assert.equal(first?.foreignAlbumId, "mb-album");
    assert.equal(first?.foreignReleaseId, "mb-release");
    assert.equal(first?.foreignTrackId, "mb-track-1");

    const missing = payload.tracks[1];
    assert.equal(missing?.trackFileId, undefined);
    assert.equal(missing?.audioInfo, undefined);
    assert.equal(missing?.status, undefined);
    assert.equal(missing?.path, undefined);
  });

  it("rejects albums that belong to another artist", () => {
    assert.throws(
      () =>
        buildArtistAlbumTracksResponse(
          lidarr,
          1,
          { id: 9, artistId: 2, title: "Wrong" },
          [],
          [],
        ),
      /does not belong/,
    );
  });
});
