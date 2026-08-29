import { z } from "zod";

export const MediaKindSchema = z.enum(["movie", "series"]);
export type MediaKind = z.infer<typeof MediaKindSchema>;

/** Mirrors Radarr poster status bar colors. */
export const AvailabilitySchema = z.enum([
  "downloaded",
  "missing",
  "unavailable",
  "unmonitored",
]);
export type Availability = z.infer<typeof AvailabilitySchema>;

export const MediaItemSchema = z.object({
  kind: MediaKindSchema,
  instanceId: z.string(),
  externalId: z.number().int(),
  title: z.string(),
  /** Radarr/Sonarr sort title — used for A–Z jumper and ordering. */
  sortTitle: z.string().optional(),
  year: z.number().int().optional(),
  overview: z.string().optional(),
  posterUrl: z.string().optional(),
  monitored: z.boolean(),
  inLibrary: z.boolean(),
  hasFile: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  availability: AvailabilitySchema,
  tmdbId: z.number().int().optional(),
  tvdbId: z.number().int().optional(),
  episodeFileCount: z.number().int().optional(),
  episodeCount: z.number().int().optional(),
});
export type MediaItem = z.infer<typeof MediaItemSchema>;
