import { z } from "zod";
import { MovieMinimumAvailabilitySchema, MovieRootFolderSchema } from "./movies.js";

export const CollectionSortKeySchema = z.enum(["title", "missing", "monitored"]);
export type CollectionSortKey = z.infer<typeof CollectionSortKeySchema>;

export const CollectionSortDirectionSchema = z.enum(["asc", "desc"]);
export type CollectionSortDirection = z.infer<typeof CollectionSortDirectionSchema>;

export const CollectionFilterKeySchema = z.enum([
  "all",
  "monitored",
  "unmonitored",
  "missing",
]);
export type CollectionFilterKey = z.infer<typeof CollectionFilterKeySchema>;

export const COLLECTION_SORT_OPTIONS: Array<{ value: CollectionSortKey; label: string }> = [
  { value: "title", label: "Title" },
  { value: "missing", label: "Missing Movies" },
  { value: "monitored", label: "Monitored" },
];

export const COLLECTION_FILTER_OPTIONS: Array<{ value: CollectionFilterKey; label: string }> = [
  { value: "all", label: "All" },
  { value: "monitored", label: "Monitored Only" },
  { value: "unmonitored", label: "Unmonitored" },
  { value: "missing", label: "Missing" },
];

export const CollectionMovieItemSchema = z.object({
  tmdbId: z.number().int(),
  title: z.string(),
  year: z.number().int().optional(),
  posterUrl: z.string().optional(),
  isExisting: z.boolean(),
  isExcluded: z.boolean(),
  /** Radarr movie id when this title is already in the instance library. */
  movieId: z.number().int().optional(),
});
export type CollectionMovieItem = z.infer<typeof CollectionMovieItemSchema>;

export const CollectionListItemSchema = z.object({
  instanceId: z.string(),
  externalId: z.number().int(),
  title: z.string(),
  sortTitle: z.string(),
  tmdbId: z.number().int().optional(),
  overview: z.string().optional(),
  monitored: z.boolean(),
  missingMovies: z.number().int().nonnegative(),
  movieCount: z.number().int().nonnegative(),
  qualityProfileId: z.number().int().optional(),
  qualityProfileName: z.string().optional(),
  rootFolderPath: z.string().optional(),
  searchOnAdd: z.boolean(),
  minimumAvailability: MovieMinimumAvailabilitySchema,
  genres: z.array(z.string()),
  movies: z.array(CollectionMovieItemSchema),
});
export type CollectionListItem = z.infer<typeof CollectionListItemSchema>;

export const CollectionBulkUpdateRequestSchema = z.object({
  collectionIds: z.array(z.number().int()).min(1),
  monitored: z.boolean().nullable().optional(),
  monitorMovies: z.boolean().nullable().optional(),
  searchOnAdd: z.boolean().nullable().optional(),
  qualityProfileId: z.number().int().nullable().optional(),
  rootFolderPath: z.string().nullable().optional(),
  minimumAvailability: MovieMinimumAvailabilitySchema.nullable().optional(),
});
export type CollectionBulkUpdateRequest = z.infer<typeof CollectionBulkUpdateRequestSchema>;

export const CollectionEditOptionsSchema = z.object({
  qualityProfiles: z.array(z.object({ id: z.number().int(), name: z.string() })),
  rootFolders: z.array(MovieRootFolderSchema),
});
export type CollectionEditOptions = z.infer<typeof CollectionEditOptionsSchema>;
