import assert from "node:assert/strict";
import {
  formatFreeSpace,
  joinMoviePath,
  normalizeRootPath,
  rootFolderLabel,
  splitMoviePath,
} from "./moviePath.js";

const roots = [{ path: "/movies/Movies" }, { path: "/movies/Kids Movies" }];

// split: basic
{
  const result = splitMoviePath("/movies/Movies/10 Cloverfield Lane (2016)", roots);
  assert.equal(result.rootFolderPath, "/movies/Movies");
  assert.equal(result.folderName, "/10 Cloverfield Lane (2016)");
}

// split: other root
{
  const result = splitMoviePath("/movies/Kids Movies/10 Cloverfield Lane (2016)", roots);
  assert.equal(result.rootFolderPath, "/movies/Kids Movies");
  assert.equal(result.folderName, "/10 Cloverfield Lane (2016)");
}

// split: longest prefix wins
{
  const nested = [{ path: "/movies" }, { path: "/movies/Movies" }];
  const result = splitMoviePath("/movies/Movies/Foo (2020)", nested);
  assert.equal(result.rootFolderPath, "/movies/Movies");
  assert.equal(result.folderName, "/Foo (2020)");
}

// split: trailing slash on root / path
{
  const result = splitMoviePath("/movies/Movies/Foo (2020)/", [
    { path: "/movies/Movies/" },
  ]);
  assert.equal(result.rootFolderPath, "/movies/Movies");
  assert.equal(result.folderName, "/Foo (2020)");
}

// split: path equals root
{
  const result = splitMoviePath("/movies/Movies", roots);
  assert.equal(result.rootFolderPath, "/movies/Movies");
  assert.equal(result.folderName, "");
}

// split: no match — keep full path in folder, root null
{
  const result = splitMoviePath("/elsewhere/Movie (2016)", roots);
  assert.equal(result.rootFolderPath, null);
  assert.equal(result.folderName, "/elsewhere/Movie (2016)");
}

// join
assert.equal(
  joinMoviePath("/movies/Movies", "/10 Cloverfield Lane (2016)"),
  "/movies/Movies/10 Cloverfield Lane (2016)",
);
assert.equal(
  joinMoviePath("/movies/Movies/", "10 Cloverfield Lane (2016)"),
  "/movies/Movies/10 Cloverfield Lane (2016)",
);
assert.equal(joinMoviePath("/movies/Movies", ""), "/movies/Movies");
assert.equal(normalizeRootPath("/movies/Movies///"), "/movies/Movies");

// free space label
assert.equal(formatFreeSpace(17.1 * 1024 ** 4), "17.1 TiB");
assert.equal(rootFolderLabel("/movies/Movies", 17.1 * 1024 ** 4), "/movies/Movies · 17.1 TiB free");
assert.equal(rootFolderLabel("/movies/Movies"), "/movies/Movies");

console.log("moviePath tests passed");
