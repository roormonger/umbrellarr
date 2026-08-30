import assert from "node:assert/strict";
import type { Instance, MovieListItem } from "@umbrellarr/shared";
import { LibraryCache } from "./libraryCache.js";

const instance: Instance = {
  id: "radarr",
  name: "Radarr",
  kind: "radarr",
  baseUrl: "http://localhost:7878",
  apiKey: "test",
};

function movie(title: string, externalId = 1): MovieListItem {
  return {
    kind: "movie",
    instanceId: "radarr",
    externalId,
    title,
    sortTitle: title,
    monitored: true,
    inLibrary: true,
    hasFile: true,
    availability: "downloaded",
    tags: [],
    cutoffUnmet: false,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  let fetches = 0;
  let currentTitle = "Alpha";

  const cache = new LibraryCache({
    fetchMovies: async () => {
      fetches += 1;
      return [movie(currentTitle)];
    },
  });

  const miss = await cache.getMovies([instance]);
  assert.equal(miss.status, "MISS");
  assert.equal(miss.movies[0]?.title, "Alpha");
  assert.equal(fetches, 1);

  const hit = await cache.getMovies([instance]);
  assert.equal(hit.status, "HIT");
  assert.equal(fetches, 1);

  cache.invalidate("radarr");
  currentTitle = "Gamma";
  const missAgain = await cache.getMovies([instance]);
  assert.equal(missAgain.status, "MISS");
  assert.equal(missAgain.movies[0]?.title, "Gamma");
  assert.equal(fetches, 2);

  let inflightFetches = 0;
  const single = new LibraryCache({
    fetchMovies: async () => {
      inflightFetches += 1;
      await wait(40);
      return [movie("One")];
    },
  });
  const [a, b] = await Promise.all([single.getMovies([instance]), single.getMovies([instance])]);
  assert.equal(inflightFetches, 1);
  assert.equal(a.status, "MISS");
  assert.equal(b.status, "MISS");

  let shouldFail = false;
  const resilient = new LibraryCache({
    fetchMovies: async () => {
      if (shouldFail) throw new Error("radarr down");
      return [movie("Kept")];
    },
  });
  await resilient.getMovies([instance]);
  shouldFail = true;
  resilient.invalidate();
  await assert.rejects(() => resilient.getMovies([instance]));

  await resilient.refresh(instance).then(
    () => {
      throw new Error("expected refresh to fail without snapshot");
    },
    () => undefined,
  );

  shouldFail = false;
  await resilient.getMovies([instance]);
  shouldFail = true;
  const kept = await resilient.refresh(instance);
  assert.equal(kept.movies[0]?.title, "Kept");

  let clock = 0;
  let ttlFetches = 0;
  let ttlTitle = "Old";
  const ttl = new LibraryCache({
    staleMs: 60_000,
    now: () => clock,
    fetchMovies: async () => {
      ttlFetches += 1;
      return [movie(ttlTitle)];
    },
  });
  clock = 0;
  const first = await ttl.getMovies([instance]);
  assert.equal(first.status, "MISS");
  assert.equal(ttlFetches, 1);
  clock = 30_000;
  const mid = await ttl.getMovies([instance]);
  assert.equal(mid.status, "HIT");
  assert.equal(ttlFetches, 1);
  clock = 60_000;
  ttlTitle = "New";
  const expired = await ttl.getMovies([instance]);
  assert.equal(expired.status, "STALE");
  assert.equal(expired.movies[0]?.title, "New");
  assert.equal(ttlFetches, 2);
  const forced = await ttl.getMovies([instance], { force: true });
  assert.equal(forced.status, "STALE");
  assert.equal(ttlFetches, 3);

  let headFetches = 0;
  const headCache = new LibraryCache({
    headSize: 2,
    staleMs: 60_000,
    now: () => 0,
    fetchMovies: async () => {
      headFetches += 1;
      return [movie("Alpha", 1), movie("Beta", 2), movie("Charlie", 3)];
    },
  });
  const full = await headCache.getMovies([instance]);
  assert.equal(full.total, 3);
  assert.equal(full.truncated, false);
  assert.equal(headFetches, 1);
  const head = await headCache.getMovies([instance], { limit: 2 });
  assert.equal(head.status, "HIT");
  assert.equal(head.movies.length, 2);
  assert.equal(head.movies[0]?.title, "Alpha");
  assert.equal(head.movies[1]?.title, "Beta");
  assert.equal(head.total, 3);
  assert.equal(head.truncated, true);
  assert.equal(headFetches, 1);

  let durableFetches = 0;
  let durableClock = 0;
  const durable = new LibraryCache({
    headSize: 2,
    staleMs: 60_000,
    now: () => durableClock,
    fetchMovies: async () => {
      durableFetches += 1;
      await wait(20);
      return [movie("A", 1), movie("B", 2), movie("C", 3)];
    },
  });
  await durable.getMovies([instance]);
  assert.equal(durableFetches, 1);
  durableClock = 120_000;
  const started = Date.now();
  const headAfterTtl = await durable.getMovies([instance], { limit: 2 });
  assert.ok(Date.now() - started < 15, "head should not wait on a full Arr refresh");
  assert.equal(headAfterTtl.status, "HIT");
  assert.equal(headAfterTtl.movies.length, 2);
  assert.equal(headAfterTtl.total, 3);
  assert.equal(headAfterTtl.truncated, true);
  await wait(40);
  assert.equal(durableFetches, 2);

  const forcedHead = await durable.getMovies([instance], { force: true, limit: 2 });
  assert.equal(forcedHead.movies.length, 2);
  assert.equal(durableFetches, 3);

  console.log("library cache tests passed");
}

await run();
