import assert from "node:assert/strict";
import {
  createSessionToken,
  passwordsMatch,
  verifySessionToken,
} from "./session.js";

const secret = "unit-test-secret";
const token = createSessionToken(secret);
assert.equal(verifySessionToken(token, secret), true);
assert.equal(verifySessionToken(token, "other"), false);
assert.equal(passwordsMatch("abc", "abc"), true);
assert.equal(passwordsMatch("abc", "xyz"), false);
console.log("session tests passed");
