import assert from "node:assert/strict";
import { parseLibraryLimit } from "./libraryQuery.js";

assert.equal(parseLibraryLimit(undefined), undefined);
assert.equal(parseLibraryLimit(""), undefined);
assert.equal(parseLibraryLimit("abc"), undefined);
assert.equal(parseLibraryLimit("0"), undefined);
assert.equal(parseLibraryLimit("-3"), undefined);
assert.equal(parseLibraryLimit("60"), 60);
assert.equal(parseLibraryLimit("60.9"), 60);

console.log("library query tests passed");
