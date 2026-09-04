import { z } from "zod";
import { RequestMediaTypeSchema, SeerrMediaAvailabilitySchema, SeerrMediaDetailSchema } from "./requests.js";

export const DiscoverCardSchema = z.object({
  tmdbId: z.number().int(),
  mediaType: RequestMediaTypeSchema,
  title: z.string(),
  year: z.string().optional(),
  posterUrl: z.string().optional(),
  availability: SeerrMediaAvailabilitySchema.optional(),
  requestId: z.number().int().optional(),
  /** Seerr instance that owns `requestId` (may differ from the Discover content instance). */
  requestInstanceId: z.string().optional(),
});
export type DiscoverCard = z.infer<typeof DiscoverCardSchema>;

/** Hero slide: Discover card fields plus backdrop + synopsis from Seerr discover payloads. */
export const DiscoverFeaturedItemSchema = DiscoverCardSchema.extend({
  overview: z.string().optional(),
  backdropUrl: z.string().optional(),
});
export type DiscoverFeaturedItem = z.infer<typeof DiscoverFeaturedItemSchema>;

export const DiscoverGenreTileSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  /** TMDB backdrop path with duotone filter applied (full URL). */
  imageUrl: z.string().optional(),
});
export type DiscoverGenreTile = z.infer<typeof DiscoverGenreTileSchema>;

export const DiscoverCompanyTileSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  /** Duotone TMDB logo URL (copied from Seerr StudioSlider / NetworkSlider). */
  imageUrl: z.string(),
});
export type DiscoverCompanyTile = z.infer<typeof DiscoverCompanyTileSchema>;

export const DiscoverPosterRowSchema = z.object({
  key: z.string(),
  title: z.string(),
  kind: z.literal("posters"),
  items: z.array(DiscoverCardSchema),
});
export type DiscoverPosterRow = z.infer<typeof DiscoverPosterRowSchema>;

export const DiscoverGenreRowSchema = z.object({
  key: z.string(),
  title: z.string(),
  kind: z.literal("genres"),
  items: z.array(DiscoverGenreTileSchema),
});
export type DiscoverGenreRow = z.infer<typeof DiscoverGenreRowSchema>;

export const DiscoverCompanyRowSchema = z.object({
  key: z.string(),
  title: z.string(),
  kind: z.literal("companies"),
  companyKind: z.enum(["studio", "network"]),
  items: z.array(DiscoverCompanyTileSchema),
});
export type DiscoverCompanyRow = z.infer<typeof DiscoverCompanyRowSchema>;

export const DiscoverRowSchema = z.discriminatedUnion("kind", [
  DiscoverPosterRowSchema,
  DiscoverGenreRowSchema,
  DiscoverCompanyRowSchema,
]);
export type DiscoverRow = z.infer<typeof DiscoverRowSchema>;

export const DiscoverSectionSchema = z.object({
  mediaType: RequestMediaTypeSchema,
  title: z.string(),
  rows: z.array(DiscoverRowSchema),
});
export type DiscoverSection = z.infer<typeof DiscoverSectionSchema>;

export const DiscoverHomeResponseSchema = z.object({
  instanceId: z.string(),
  featured: z.array(DiscoverFeaturedItemSchema).default([]),
  movies: DiscoverSectionSchema,
  shows: DiscoverSectionSchema,
});
export type DiscoverHomeResponse = z.infer<typeof DiscoverHomeResponseSchema>;

export const DiscoverListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  genre: z.string().optional(),
  studio: z.string().optional(),
  network: z.string().optional(),
  sortBy: z.string().optional(),
  /** Use Seerr upcoming path instead of popular. */
  upcoming: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
});
export type DiscoverListQuery = z.infer<typeof DiscoverListQuerySchema>;

export const DiscoverListResponseSchema = z.object({
  instanceId: z.string(),
  mediaType: RequestMediaTypeSchema,
  page: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
  items: z.array(DiscoverCardSchema),
  title: z.string().optional(),
});
export type DiscoverListResponse = z.infer<typeof DiscoverListResponseSchema>;

export const DiscoverSearchResponseSchema = z.object({
  instanceId: z.string(),
  page: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
  items: z.array(DiscoverCardSchema),
});
export type DiscoverSearchResponse = z.infer<typeof DiscoverSearchResponseSchema>;

export const DiscoverTitleResponseSchema = z.object({
  instanceId: z.string(),
  media: SeerrMediaDetailSchema,
  requestId: z.number().int().optional(),
});
export type DiscoverTitleResponse = z.infer<typeof DiscoverTitleResponseSchema>;
