import { z } from "zod";

export const MediaKindSchema = z.enum(["movie", "series"]);
export type MediaKind = z.infer<typeof MediaKindSchema>;

export const MediaItemSchema = z.object({
  kind: MediaKindSchema,
  instanceId: z.string(),
  externalId: z.number().int(),
  title: z.string(),
  year: z.number().int().optional(),
  overview: z.string().optional(),
  posterUrl: z.string().optional(),
  monitored: z.boolean(),
  inLibrary: z.boolean(),
  hasFile: z.boolean().optional(),
  tmdbId: z.number().int().optional(),
  tvdbId: z.number().int().optional(),
  episodeFileCount: z.number().int().optional(),
  episodeCount: z.number().int().optional(),
});
export type MediaItem = z.infer<typeof MediaItemSchema>;
