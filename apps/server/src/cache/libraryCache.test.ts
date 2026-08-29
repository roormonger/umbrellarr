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

  console.log("library cache tests passed");
}

await run();
