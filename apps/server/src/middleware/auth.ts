import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { AppVariables } from "../app.js";
import { SESSION_COOKIE, verifySessionToken } from "../auth/session.js";

const PUBLIC_API_PATHS = new Set(["/api/auth/login", "/api/auth/status"]);

export function createAuthMiddleware() {
  return createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const path = new URL(c.req.url).pathname;
    if (PUBLIC_API_PATHS.has(path)) {
      await next();
      return;
    }

    const env = c.get("env");
    if (!env.authRequired) {
      await next();
      return;
    }

    const token = getCookie(c, SESSION_COOKIE);
    if (!token || !verifySessionToken(token, env.sessionSecret)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  });
}
