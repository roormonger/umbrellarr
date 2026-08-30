import { Hono } from "hono";
import {
  InstanceCreateRequestSchema,
  InstanceTestRequestSchema,
  InstanceUpdateRequestSchema,
  type Instance,
  type InstanceStatus,
  type InstanceTestResult,
} from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import { checkInstanceStatus } from "../servarr/status.js";

function toPublic(instance: Instance) {
  const { apiKey: _apiKey, ...pub } = instance;
  return pub;
}

export function createInstancesRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/", (c) => {
    const instances = c.get("instanceStore").list().map(toPublic);
    return c.json({ instances });
  });

  app.get("/status", async (c) => {
    const instances = c.get("instanceStore").list();
    const statuses: InstanceStatus[] = await Promise.all(
      instances.map((instance) => checkInstanceStatus(instance)),
    );
    return c.json({ statuses });
  });

  app.post("/test", async (c) => {
    const body = InstanceTestRequestSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: body.error.issues[0]?.message ?? "Invalid body" }, 400);
    }

    const store = c.get("instanceStore");
    let apiKey = body.data.apiKey?.trim();
    const baseUrl = body.data.baseUrl.replace(/\/+$/, "");
    let kind = body.data.kind;
    let name = "Test";
    let id = body.data.id ?? "test";

    if (body.data.id) {
      const existing = store.get(body.data.id);
      if (!existing) {
        return c.json({ error: `Instance ${body.data.id} not found` }, 404);
      }
      apiKey = apiKey || existing.apiKey;
      kind = kind ?? existing.kind;
      name = existing.name;
      id = existing.id;
    }

    if (!apiKey) {
      return c.json({ error: "API key is required to test the connection" }, 400);
    }
    if (!kind) {
      return c.json({ error: "kind is required" }, 400);
    }

    const probe: Instance = {
      id,
      name,
      kind,
      baseUrl,
      apiKey,
    };
    const status = await checkInstanceStatus(probe);
    const result: InstanceTestResult = {
      online: status.online,
      version: status.version,
      error: status.error,
    };
    return c.json(result);
  });

  app.post("/", async (c) => {
    const body = InstanceCreateRequestSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: body.error.issues[0]?.message ?? "Invalid body" }, 400);
    }

    try {
      const created = c.get("instanceStore").create(body.data);
      const libraryCache = c.get("libraryCache");
      if (
        created.kind === "radarr" ||
        created.kind === "sonarr" ||
        created.kind === "lidarr"
      ) {
        libraryCache.warm([created]);
      }
      return c.json({ instance: toPublic(created) }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create instance";
      const status = message.includes("already uses") ? 409 : 400;
      return c.json({ error: message }, status);
    }
  });

  app.put("/:id", async (c) => {
    const body = InstanceUpdateRequestSchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: body.error.issues[0]?.message ?? "Invalid body" }, 400);
    }

    try {
      const updated = c.get("instanceStore").update(c.req.param("id"), body.data);
      if (
        updated.kind === "radarr" ||
        updated.kind === "sonarr" ||
        updated.kind === "lidarr"
      ) {
        c.get("libraryCache").warm([updated]);
      }
      return c.json({ instance: toPublic(updated) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update instance";
      if (message.includes("not found")) return c.json({ error: message }, 404);
      const status = message.includes("already uses") ? 409 : 400;
      return c.json({ error: message }, status);
    }
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    try {
      c.get("instanceStore").remove(id);
      c.get("libraryCache").invalidate(id);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete instance";
      if (message.includes("not found")) return c.json({ error: message }, 404);
      return c.json({ error: message }, 400);
    }
  });

  return app;
}
