import type {
  CollectionFilterKey,
  CollectionListItem,
  CollectionSortDirection,
  CollectionSortKey,
} from "@umbrellarr/shared";

export function filterCollections(
  items: CollectionListItem[],
  filterKey: CollectionFilterKey,
): CollectionListItem[] {
  if (filterKey === "monitored") return items.filter((c) => c.monitored);
  if (filterKey === "unmonitored") return items.filter((c) => !c.monitored);
  if (filterKey === "missing") return items.filter((c) => c.missingMovies > 0);
  return items;
}

export function applyCollectionQuery(
  items: CollectionListItem[],
  query: string,
): CollectionListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.sortTitle.toLowerCase().includes(q) ||
      c.genres.some((g) => g.toLowerCase().includes(q)) ||
      c.movies.some((m) => m.title.toLowerCase().includes(q)),
  );
}

export function sortCollections(
  items: CollectionListItem[],
  sortKey: CollectionSortKey,
  direction: CollectionSortDirection,
): CollectionListItem[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "missing") {
      cmp = a.missingMovies - b.missingMovies;
    } else if (sortKey === "monitored") {
      cmp = Number(b.monitored) - Number(a.monitored);
    }
    if (cmp === 0) {
      cmp = a.sortTitle.localeCompare(b.sortTitle, undefined, { sensitivity: "base" });
    }
    return cmp * sign;
  });
}
