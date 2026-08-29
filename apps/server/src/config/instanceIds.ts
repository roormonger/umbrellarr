import type { ArrKind } from "@umbrellarr/shared";

export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Stable id for URLs/cache; renaming later does not change id. */
export function makeInstanceId(kind: ArrKind, name: string, taken: Set<string>): string {
  const slug = slugifyName(name) || kind;
  let id = slug === kind || slug.startsWith(`${kind}-`) ? slug : `${kind}-${slug}`;
  if (!taken.has(id)) return id;
  let n = 2;
  while (taken.has(`${id}-${n}`)) n += 1;
  return `${id}-${n}`;
}
