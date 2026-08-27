import { z } from "zod";

export const ArrKindSchema = z.enum(["radarr", "sonarr"]);
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
