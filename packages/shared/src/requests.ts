import { z } from "zod";

export const RequestMediaTypeSchema = z.enum(["movie", "tv"]);
export type RequestMediaType = z.infer<typeof RequestMediaTypeSchema>;

export const RequestFilterSchema = z.enum([
  "all",
  "pending",
  "approved",
  "processing",
  "available",
  "unavailable",
  "failed",
  "deleted",
  "completed",
]);
export type RequestFilter = z.infer<typeof RequestFilterSchema>;

export const RequestSortSchema = z.enum(["added", "modified"]);
export type RequestSort = z.infer<typeof RequestSortSchema>;

export const RequestSortDirectionSchema = z.enum(["asc", "desc"]);
export type RequestSortDirection = z.infer<typeof RequestSortDirectionSchema>;

export const RequestListQuerySchema = z.object({
  take: z.coerce.number().int().positive().max(100).default(25),
  skip: z.coerce.number().int().nonnegative().default(0),
  filter: RequestFilterSchema.default("pending"),
  mediaType: z.enum(["all", "movie", "tv"]).default("all"),
  sort: RequestSortSchema.default("added"),
  sortDirection: RequestSortDirectionSchema.default("desc"),
  /** Seerr user id; omit for all requesters. */
  requestedBy: z.coerce.number().int().positive().optional(),
});
export type RequestListQuery = z.infer<typeof RequestListQuerySchema>;

/** Seerr request.status: 1 pending, 2 approved, 3 declined, 4 failed, 5 completed */
export const RequestStatusSchema = z.enum([
  "pending",
  "approved",
  "declined",
  "failed",
  "completed",
  "unknown",
]);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const RequestUserSchema = z.object({
  id: z.number().int(),
  displayName: z.string(),
  email: z.string().optional(),
  avatar: z.string().optional(),
});
export type RequestUser = z.infer<typeof RequestUserSchema>;

export const RequestSeasonSchema = z.object({
  seasonNumber: z.number().int(),
  status: RequestStatusSchema,
  episodeCount: z.number().int().optional(),
});
export type RequestSeason = z.infer<typeof RequestSeasonSchema>;

export const MediaRequestItemSchema = z.object({
  id: z.number().int(),
  instanceId: z.string().optional(),
  instanceName: z.string().optional(),
  mediaType: RequestMediaTypeSchema,
  status: RequestStatusSchema,
  is4k: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  tmdbId: z.number().int(),
  title: z.string(),
  year: z.string().optional(),
  posterUrl: z.string().optional(),
  backdropUrl: z.string().optional(),
  seasons: z.array(RequestSeasonSchema).default([]),
  requestedBy: RequestUserSchema.optional(),
  serverId: z.number().int().optional(),
  profileId: z.number().int().optional(),
  rootFolder: z.string().optional(),
  languageProfileId: z.number().int().optional(),
  tags: z.array(z.number().int()).default([]),
  profileName: z.string().optional(),
});
export type MediaRequestItem = z.infer<typeof MediaRequestItemSchema>;

export const RequestPageInfoSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  pages: z.number().int(),
  results: z.number().int(),
});
export type RequestPageInfo = z.infer<typeof RequestPageInfoSchema>;

export const MediaRequestListResponseSchema = z.object({
  pageInfo: RequestPageInfoSchema,
  results: z.array(MediaRequestItemSchema),
});
export type MediaRequestListResponse = z.infer<typeof MediaRequestListResponseSchema>;

export const UnifiedRequestListQuerySchema = RequestListQuerySchema.extend({
  instanceId: z.string().optional(),
});
export type UnifiedRequestListQuery = z.infer<typeof UnifiedRequestListQuerySchema>;

export const UnifiedMediaRequestListResponseSchema = MediaRequestListResponseSchema.extend({
  errors: z
    .array(
      z.object({
        instanceId: z.string(),
        instanceName: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});
export type UnifiedMediaRequestListResponse = z.infer<typeof UnifiedMediaRequestListResponseSchema>;

export const RequestUpdateBodySchema = z.object({
  mediaType: RequestMediaTypeSchema,
  serverId: z.number().int(),
  profileId: z.number().int(),
  rootFolder: z.string().min(1),
  userId: z.number().int(),
  tags: z.array(z.number().int()).default([]),
  languageProfileId: z.number().int().optional(),
  seasons: z.array(z.number().int()).optional(),
  approve: z.boolean().optional(),
});
export type RequestUpdateBody = z.infer<typeof RequestUpdateBodySchema>;

export const SeerrServiceServerSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  is4k: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  activeProfileId: z.number().int().optional(),
  activeDirectory: z.string().optional(),
  activeLanguageProfileId: z.number().int().optional(),
  activeTags: z.array(z.number().int()).optional(),
});
export type SeerrServiceServer = z.infer<typeof SeerrServiceServerSchema>;

export const SeerrServiceDetailSchema = z.object({
  server: SeerrServiceServerSchema,
  profiles: z.array(z.object({ id: z.number().int(), name: z.string() })),
  rootFolders: z.array(
    z.object({
      id: z.number().int().optional(),
      path: z.string(),
      freeSpace: z.number().optional(),
      totalSpace: z.number().optional(),
    }),
  ),
  tags: z.array(z.object({ id: z.number().int(), label: z.string() })),
  languageProfiles: z
    .array(z.object({ id: z.number().int(), name: z.string() }))
    .optional(),
});
export type SeerrServiceDetail = z.infer<typeof SeerrServiceDetailSchema>;

export const RequestEditDetailSchema = MediaRequestItemSchema.extend({
  seasonOptions: z.array(RequestSeasonSchema).default([]),
});
export type RequestEditDetail = z.infer<typeof RequestEditDetailSchema>;

export const SeerrCreditSchema = z.object({
  id: z.number().int(),
  type: z.enum(["cast", "crew"]),
  personName: z.string(),
  character: z.string().optional(),
  job: z.string().optional(),
  order: z.number().int().optional(),
  headshotUrl: z.string().optional(),
});
export type SeerrCredit = z.infer<typeof SeerrCreditSchema>;

export const SeerrMediaSeasonDetailSchema = z.object({
  seasonNumber: z.number().int(),
  name: z.string().optional(),
  episodeCount: z.number().int().optional(),
  airDate: z.string().optional(),
  overview: z.string().optional(),
  /** Request season status when this season is on the Seerr request. */
  requestStatus: RequestStatusSchema.optional(),
});
export type SeerrMediaSeasonDetail = z.infer<typeof SeerrMediaSeasonDetailSchema>;

export const SeerrMediaLinkSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
});
export type SeerrMediaLink = z.infer<typeof SeerrMediaLinkSchema>;

/** Availability from Seerr mediaInfo.status (not request.status). */
export const SeerrMediaAvailabilitySchema = z.enum([
  "unknown",
  "pending",
  "processing",
  "partial",
  "available",
  "deleted",
]);
export type SeerrMediaAvailability = z.infer<typeof SeerrMediaAvailabilitySchema>;

export const SeerrMediaDetailSchema = z.object({
  mediaType: RequestMediaTypeSchema,
  tmdbId: z.number().int(),
  title: z.string(),
  year: z.string().optional(),
  overview: z.string().optional(),
  tagline: z.string().optional(),
  runtime: z.number().int().optional(),
  genres: z.array(z.string()).default([]),
  certification: z.string().optional(),
  /** TMDB production status string, e.g. "Released" / "In Production". */
  productionStatus: z.string().optional(),
  mediaAvailability: SeerrMediaAvailabilitySchema.optional(),
  voteAverage: z.number().optional(),
  originalLanguage: z.string().optional(),
  network: z.string().optional(),
  studio: z.string().optional(),
  releaseDate: z.string().optional(),
  firstAirDate: z.string().optional(),
  posterUrl: z.string().optional(),
  backdropUrl: z.string().optional(),
  trailerYouTubeId: z.string().optional(),
  cast: z.array(SeerrCreditSchema).default([]),
  crew: z.array(SeerrCreditSchema).default([]),
  creators: z.array(z.string()).default([]),
  seasons: z.array(SeerrMediaSeasonDetailSchema).default([]),
  links: z.array(SeerrMediaLinkSchema).default([]),
  keywords: z.array(z.string()).default([]),
});
export type SeerrMediaDetail = z.infer<typeof SeerrMediaDetailSchema>;

export const RequestMediaPageDetailSchema = z.object({
  request: RequestEditDetailSchema,
  media: SeerrMediaDetailSchema,
});
export type RequestMediaPageDetail = z.infer<typeof RequestMediaPageDetailSchema>;
