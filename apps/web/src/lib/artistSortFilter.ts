import type {
  ArtistFilterKey,
  ArtistListItem,
  ArtistSortDirection,
  ArtistSortKey,
} from "@umbrellarr/shared";

const STATUS_ORDER: Record<ArtistListItem["availability"], number> = {
  queued: 0,
  downloading: 1,
  missingMonitored: 2,
  missingUnmonitored: 3,
  unreleased: 4,
  continuing: 5,
  ended: 6,
  downloaded: 7,
  downloadedUnmonitored: 8,
};

function trackProgress(artist: ArtistListItem): number {
  const total = artist.trackCount ?? 0;
  if (total <= 0) return Number.NaN;
  return (artist.trackFileCount ?? 0) / total;
}

function sortValue(artist: ArtistListItem, key: ArtistSortKey): string | number {
  switch (key) {
    case "monitoredStatus":
      return STATUS_ORDER[artist.availability] * 10 + (artist.monitored ? 0 : 1);
    case "title":
      return (artist.sortTitle ?? artist.title).toLocaleLowerCase();
    case "qualityProfile":
      return (artist.qualityProfileName ?? "").toLocaleLowerCase();
    case "metadataProfile":
      return (artist.metadataProfileName ?? "").toLocaleLowerCase();
    case "added":
      return artist.added ? Date.parse(artist.added) : Number.NaN;
    case "path":
      return (artist.path ?? "").toLocaleLowerCase();
    case "sizeOnDisk":
      return artist.sizeOnDisk ?? Number.NaN;
    case "trackProgress":
      return trackProgress(artist);
    case "albumCount":
      return artist.albumCount ?? Number.NaN;
    case "tags":
      return artist.tags.join(", ").toLocaleLowerCase();
  }
}

function compareValues(a: string | number, b: string | number): number {
  const aEmpty = a === "" || (typeof a === "number" && Number.isNaN(a));
  const bEmpty = b === "" || (typeof b === "number" && Number.isNaN(b));
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  }
  return (a as number) - (b as number);
}

export function filterArtists(
  artists: ArtistListItem[],
  filter: ArtistFilterKey,
): ArtistListItem[] {
  switch (filter) {
    case "all":
      return artists;
    case "monitored":
      return artists.filter((a) => a.monitored);
    case "unmonitored":
      return artists.filter((a) => !a.monitored);
    case "missing":
      return artists.filter(
        (a) =>
          a.monitored &&
          (a.trackCount ?? 0) > 0 &&
          (a.trackFileCount ?? 0) < (a.trackCount ?? 0),
      );
    case "wanted":
      return artists.filter(
        (a) =>
          a.monitored &&
          (a.trackCount ?? 0) > 0 &&
          (a.trackFileCount ?? 0) < (a.trackCount ?? 0),
      );
    case "cutoffUnmet":
      return artists.filter((a) => a.cutoffUnmet);
  }
}

export function sortArtists(
  artists: ArtistListItem[],
  key: ArtistSortKey,
  direction: ArtistSortDirection,
): ArtistListItem[] {
  const dir = direction === "asc" ? 1 : -1;
  return [...artists].sort((left, right) => {
    const primary = compareValues(sortValue(left, key), sortValue(right, key));
    if (primary !== 0) return primary * dir;
    return (left.sortTitle ?? left.title).localeCompare(right.sortTitle ?? right.title, undefined, {
      sensitivity: "base",
    });
  });
}

export function applyArtistQuery(artists: ArtistListItem[], query: string): ArtistListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return artists;
  return artists.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.genres.some((g) => g.toLowerCase().includes(q)) ||
      a.foreignArtistId?.toLowerCase().includes(q),
  );
}
