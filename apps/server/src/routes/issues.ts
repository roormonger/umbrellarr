import { Hono } from "hono";
import { IssueAddCommentRequestSchema, UnifiedIssueListQuerySchema } from "@umbrellarr/shared";
import type { AppVariables } from "../app.js";
import {
  addMediaIssueComment,
  getMediaIssueDetail,
  listUnifiedMediaIssues,
  resolveMediaIssue,
} from "../servarr/seerrIssues.js";

export function createIssuesRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/unified", async (c) => {
    const parsed = UnifiedIssueListQuerySchema.safeParse({
      take: c.req.query("take") ?? undefined,
      skip: c.req.query("skip") ?? undefined,
      filter: c.req.query("filter") ?? undefined,
      sort: c.req.query("sort") ?? undefined,
      sortDirection: c.req.query("sortDirection") ?? undefined,
      instanceId: c.req.query("instanceId") ?? undefined,
    });
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid query" }, 400);
    }
    try {
      const payload = await listUnifiedMediaIssues(c.get("instances"), parsed.data);
      return c.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load issues";
      return c.json({ error: message }, message.includes("not found") ? 404 : 502);
    }
  });

  app.get("/:instanceId/:issueId", async (c) => {
    const issueId = Number(c.req.param("issueId"));
    if (!Number.isFinite(issueId)) {
      return c.json({ error: "Invalid issue id" }, 400);
    }
    try {
      const detail = await getMediaIssueDetail(
        c.get("instances"),
        c.get("libraryCache"),
        c.req.param("instanceId"),
        issueId,
      );
      return c.json(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load issue";
      const status = message.includes("not found") ? 404 : message.includes("HTTP 404") ? 404 : 502;
      return c.json({ error: message }, status);
    }
  });

  app.post("/:instanceId/:issueId/comment", async (c) => {
    const issueId = Number(c.req.param("issueId"));
    if (!Number.isFinite(issueId)) {
      return c.json({ error: "Invalid issue id" }, 400);
    }
    const body = await c.req.json().catch(() => null);
    const parsed = IssueAddCommentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
    }
    try {
      const detail = await addMediaIssueComment(
        c.get("instances"),
        c.get("libraryCache"),
        c.req.param("instanceId"),
        issueId,
        parsed.data.message,
      );
      return c.json(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add comment";
      return c.json({ error: message }, 502);
    }
  });

  app.post("/:instanceId/:issueId/resolve", async (c) => {
    const issueId = Number(c.req.param("issueId"));
    if (!Number.isFinite(issueId)) {
      return c.json({ error: "Invalid issue id" }, 400);
    }
    try {
      const detail = await resolveMediaIssue(
        c.get("instances"),
        c.get("libraryCache"),
        c.req.param("instanceId"),
        issueId,
      );
      return c.json(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resolve issue";
      return c.json({ error: message }, 502);
    }
  });

  return app;
}
