import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { LoginRequestSchema } from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import {
  SESSION_COOKIE,
  createSessionToken,
  passwordsMatch,
  verifySessionToken,
} from "../auth/session.js";

export function createAuthRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/status", (c) => {
    const env = c.get("env");
    if (!env.authRequired) {
      return c.json({ authenticated: true, authRequired: false });
    }

    const token = getCookie(c, SESSION_COOKIE);
    const authenticated = Boolean(token && verifySessionToken(token, env.sessionSecret));
    return c.json({ authenticated, authRequired: true });
  });

  app.post("/login", async (c) => {
    const env = c.get("env");
    if (!env.authRequired || !env.APP_PASSWORD) {
      return c.json({ ok: true, authRequired: false });
    }

    const body = LoginRequestSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: "Invalid request" }, 400);
    }

    if (!passwordsMatch(body.data.password, env.APP_PASSWORD)) {
      return c.json({ error: "Invalid password" }, 401);
    }

    const token = createSessionToken(env.sessionSecret);
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      secure: env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json({ ok: true });
  });

  app.post("/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  return app;
}
