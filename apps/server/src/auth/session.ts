import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "umbrellarr_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function createSessionToken(secret: string, now = Date.now()): string {
  const exp = String(now + SESSION_TTL_MS);
  const sig = sign(exp, secret);
  return `${exp}.${sig}`;
}

export function verifySessionToken(token: string, secret: string, now = Date.now()): boolean {
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;

  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false;

  const expected = sign(exp, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function passwordsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still run a compare to reduce trivial timing leaks on length.
    timingSafeEqual(Buffer.alloc(b.length), b);
    return false;
  }
  return timingSafeEqual(a, b);
}
