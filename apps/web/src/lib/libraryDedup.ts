import type { ArtistListItem, InstanceKind, InstancePublic, MovieListItem, SeriesListItem } from "@umbrellarr/shared";
import { pickInstanceId } from "@/lib/lastInstance";

export type LibraryGroup<T> = {
  key: string;
  copies: T[];
  primary: T;
  isMultiInstance: boolean;
};

type WithInstance = { instanceId: string };

function sortCopies<T extends WithInstance>(
  copies: T[],
  instanceNames: Map<string, string>,
): T[] {
  return [...copies].sort((a, b) => {
    const nameA = instanceNames.get(a.instanceId) ?? a.instanceId;
    const nameB = instanceNames.get(b.instanceId) ?? b.instanceId;
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });
}

function pickPrimary<T extends WithInstance>(
  copies: T[],
  kind: InstanceKind,
  instances: InstancePublic[],
  instanceNames: Map<string, string>,
): T {
  const preferredId = pickInstanceId(kind, instances);
  if (preferredId) {
    const match = copies.find((copy) => copy.instanceId === preferredId);
    if (match) return match;
  }
  return sortCopies(copies, instanceNames)[0]!;
}

function groupItems<T extends WithInstance>(
  items: T[],
  keyFor: (item: T) => string | undefined,
  kind: InstanceKind,
  instances: InstancePublic[],
  instanceNames: Map<string, string>,
): LibraryGroup<T>[] {
  const buckets = new Map<string, T[]>();
  const order: string[] = [];

  for (const item of items) {
    const mergeKey = keyFor(item);
    const key = mergeKey ?? `${item.instanceId}:${(item as { externalId?: number }).externalId ?? "unknown"}`;
    if (!buckets.has(key)) order.push(key);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  return order.map((key) => {
    const copies = buckets.get(key)!;
    const distinctInstances = new Set(copies.map((copy) => copy.instanceId));
    const sorted = sortCopies(copies, instanceNames);
    const primary = pickPrimary(sorted, kind, instances, instanceNames);
    return {
      key,
      copies: sorted,
      primary,
      isMultiInstance: distinctInstances.size > 1,
    };
  });
}

export function groupMovies(
  movies: MovieListItem[],
  instances: InstancePublic[],
  instanceNames: Map<string, string>,
): LibraryGroup<MovieListItem>[] {
  return groupItems(
    movies,
    (movie) => (movie.tmdbId != null ? `tmdb:${movie.tmdbId}` : undefined),
    "radarr",
    instances,
    instanceNames,
  );
}

export function groupShows(
  series: SeriesListItem[],
  instances: InstancePublic[],
  instanceNames: Map<string, string>,
): LibraryGroup<SeriesListItem>[] {
  return groupItems(
    series,
    (show) => {
      if (show.tvdbId != null) return `tvdb:${show.tvdbId}`;
      if (show.tmdbId != null) return `tmdb:${show.tmdbId}`;
      return undefined;
    },
    "sonarr",
    instances,
    instanceNames,
  );
}

export function groupArtists(
  artists: ArtistListItem[],
  instances: InstancePublic[],
  instanceNames: Map<string, string>,
): LibraryGroup<ArtistListItem>[] {
  return groupItems(
    artists,
    (artist) =>
      artist.foreignArtistId ? `mbid:${artist.foreignArtistId}` : undefined,
    "lidarr",
    instances,
    instanceNames,
  );
}

export function instanceNameMap(instances: InstancePublic[]): Map<string, string> {
  return new Map(instances.map((instance) => [instance.id, instance.name]));
}
