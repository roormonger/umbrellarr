import { z } from "zod";

export const MediaKindSchema = z.enum(["movie", "series", "artist"]);
export type MediaKind = z.infer<typeof MediaKindSchema>;

/**
 * Poster status-bar states mirrored from Arr index progress bars / footers.
 * Radarr: downloaded | downloadedUnmonitored | missingMonitored | missingUnmonitored | queued | unreleased
 * Sonarr/Lidarr: continuing | ended | missingMonitored | missingUnmonitored | downloading
 */
export const AvailabilitySchema = z.enum([
  "downloaded",
  "downloadedUnmonitored",
  "missingMonitored",
  "missingUnmonitored",
  "queued",
  "unreleased",
  "continuing",
  "ended",
  "downloading",
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
  /** Library list items omit this (always true); lookup/search rows set it explicitly. */
  inLibrary: z.boolean().optional(),
  hasFile: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  availability: AvailabilitySchema,
  tmdbId: z.number().int().optional(),
  tvdbId: z.number().int().optional(),
  episodeFileCount: z.number().int().optional(),
  episodeCount: z.number().int().optional(),
});
export type MediaItem = z.infer<typeof MediaItemSchema>;
