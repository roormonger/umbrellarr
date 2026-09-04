import { z } from "zod";
import { ArrKindSchema } from "./instances.js";

export const WantedModeSchema = z.enum(["missing", "cutoff"]);
export type WantedMode = z.infer<typeof WantedModeSchema>;

export const WantedListItemSchema = z.object({
  id: z.number().int(),
  instanceId: z.string(),
  kind: ArrKindSchema,
  title: z.string(),
  monitored: z.boolean(),
  year: z.number().int().optional(),
  quality: z.string().optional(),
  isAvailable: z.boolean().optional(),
  movieId: z.number().int().optional(),
  seriesId: z.number().int().optional(),
  seriesTitle: z.string().optional(),
  episodeId: z.number().int().optional(),
  seasonNumber: z.number().int().optional(),
  episodeNumber: z.number().int().optional(),
  episodeTitle: z.string().optional(),
  airDate: z.string().optional(),
  artistId: z.number().int().optional(),
  artistName: z.string().optional(),
  albumId: z.number().int().optional(),
  albumTitle: z.string().optional(),
  albumType: z.string().optional(),
  releaseDate: z.string().optional(),
});
export type WantedListItem = z.infer<typeof WantedListItemSchema>;

export const UnifiedWantedErrorSchema = z.object({
  instanceId: z.string(),
  instanceName: z.string(),
  message: z.string(),
});
export type UnifiedWantedError = z.infer<typeof UnifiedWantedErrorSchema>;

export const UnifiedWantedResponseSchema = z.object({
  items: z.array(WantedListItemSchema),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(50),
  totalRecords: z.number().int().nonnegative().default(0),
  mode: WantedModeSchema,
  errors: z.array(UnifiedWantedErrorSchema).default([]),
});
export type UnifiedWantedResponse = z.infer<typeof UnifiedWantedResponseSchema>;

export const WantedSearchRequestSchema = z.object({
  mode: WantedModeSchema,
  ids: z.array(z.number().int()).optional(),
});
export type WantedSearchRequest = z.infer<typeof WantedSearchRequestSchema>;

export const WantedUnmonitorItemSchema = z.object({
  instanceId: z.string().min(1),
  kind: ArrKindSchema,
  ids: z.array(z.number().int()).min(1),
});

export const WantedUnmonitorRequestSchema = z.object({
  items: z.array(WantedUnmonitorItemSchema).min(1),
});
export type WantedUnmonitorRequest = z.infer<typeof WantedUnmonitorRequestSchema>;

export const WantedMonitorRequestSchema = WantedUnmonitorRequestSchema;
export type WantedMonitorRequest = WantedUnmonitorRequest;
