import { z } from "zod";

export const ArrKindSchema = z.enum(["radarr", "sonarr", "lidarr"]);
export type ArrKind = z.infer<typeof ArrKindSchema>;

export const InstanceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: ArrKindSchema,
  baseUrl: z.string().url(),
  /** Present only on the server; never returned to the browser. */
  apiKey: z.string().min(1).optional(),
});
export type Instance = z.infer<typeof InstanceSchema>;

export const InstancePublicSchema = InstanceSchema.omit({ apiKey: true });
export type InstancePublic = z.infer<typeof InstancePublicSchema>;

export const InstanceStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: ArrKindSchema,
  baseUrl: z.string(),
  online: z.boolean(),
  version: z.string().optional(),
  error: z.string().optional(),
});
export type InstanceStatus = z.infer<typeof InstanceStatusSchema>;

export const InstanceCreateRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: ArrKindSchema,
  baseUrl: z.string().trim().url(),
  apiKey: z.string().trim().min(1),
});
export type InstanceCreateRequest = z.infer<typeof InstanceCreateRequestSchema>;

export const InstanceUpdateRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: ArrKindSchema,
  baseUrl: z.string().trim().url(),
  /** Omit or leave empty to keep the existing key. */
  apiKey: z.string().trim().min(1).optional(),
});
export type InstanceUpdateRequest = z.infer<typeof InstanceUpdateRequestSchema>;

export const InstanceTestRequestSchema = z.object({
  kind: ArrKindSchema.optional(),
  baseUrl: z.string().trim().url(),
  apiKey: z.string().trim().min(1).optional(),
  /** When set, missing apiKey uses the stored key for this id. */
  id: z.string().min(1).optional(),
});
export type InstanceTestRequest = z.infer<typeof InstanceTestRequestSchema>;

export const InstanceTestResultSchema = z.object({
  online: z.boolean(),
  version: z.string().optional(),
  error: z.string().optional(),
});
export type InstanceTestResult = z.infer<typeof InstanceTestResultSchema>;
