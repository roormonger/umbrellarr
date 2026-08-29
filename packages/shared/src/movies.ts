import { z } from "zod";
import { MediaItemSchema } from "./media.js";

export const MovieSortKeySchema = z.enum([
  "monitoredStatus",
  "title",
  "studio",
  "qualityProfile",
  "added",
  "year",
  "inCinemas",
  "digitalRelease",
  "physicalRelease",
  "releaseDate",
  "tmdbRating",
  "imdbRating",
  "tomatoRating",
  "traktRating",
  "popularity",
  "path",
  "sizeOnDisk",
  "certification",
  "originalTitle",
  "originalLanguage",
  "tags",
]);
export type MovieSortKey = z.infer<typeof MovieSortKeySchema>;

export const MovieSortDirectionSchema = z.enum(["asc", "desc"]);
export type MovieSortDirection = z.infer<typeof MovieSortDirectionSchema>;

export const MovieFilterKeySchema = z.enum([
  "all",
  "monitored",
  "unmonitored",
  "missing",
  "wanted",
  "cutoffUnmet",
]);
export type MovieFilterKey = z.infer<typeof MovieFilterKeySchema>;

export const MovieListItemSchema = MediaItemSchema.extend({
  studio: z.string().optional(),
  qualityProfileId: z.number().int().optional(),
  qualityProfileName: z.string().optional(),
  added: z.string().optional(),
  inCinemas: z.string().optional(),
  digitalRelease: z.string().optional(),
  physicalRelease: z.string().optional(),
  tmdbRating: z.number().optional(),
  imdbRating: z.number().optional(),
  tomatoRating: z.number().optional(),
  traktRating: z.number().optional(),
  popularity: z.number().optional(),
  path: z.string().optional(),
  sizeOnDisk: z.number().nonnegative().optional(),
  certification: z.string().optional(),
  originalTitle: z.string().optional(),
  originalLanguage: z.string().optional(),
  tags: z.array(z.string()).default([]),
  cutoffUnmet: z.boolean().default(false),
});
export type MovieListItem = z.infer<typeof MovieListItemSchema>;

export const MOVIE_SORT_OPTIONS: Array<{ value: MovieSortKey; label: string }> = [
  { value: "monitoredStatus", label: "Monitored/Status" },
  { value: "title", label: "Title" },
  { value: "studio", label: "Studio" },
  { value: "qualityProfile", label: "Quality Profile" },
  { value: "added", label: "Added" },
  { value: "year", label: "Year" },
  { value: "inCinemas", label: "In Cinemas" },
  { value: "digitalRelease", label: "Digital Release" },
  { value: "physicalRelease", label: "Physical Release" },
  { value: "releaseDate", label: "Release Date" },
  { value: "tmdbRating", label: "TMDb Rating" },
  { value: "imdbRating", label: "IMDb Rating" },
  { value: "tomatoRating", label: "Tomato Rating" },
  { value: "traktRating", label: "Trakt Rating" },
  { value: "popularity", label: "Popularity" },
  { value: "path", label: "Path" },
  { value: "sizeOnDisk", label: "Size on Disk" },
  { value: "certification", label: "Certification" },
  { value: "originalTitle", label: "Original Title" },
  { value: "originalLanguage", label: "Original Language" },
  { value: "tags", label: "Tags" },
];

export const MOVIE_FILTER_OPTIONS: Array<{ value: MovieFilterKey; label: string }> = [
  { value: "all", label: "All" },
  { value: "monitored", label: "Monitored Only" },
  { value: "unmonitored", label: "Unmonitored" },
  { value: "missing", label: "Missing" },
  { value: "wanted", label: "Wanted" },
  { value: "cutoffUnmet", label: "Cutoff Unmet" },
];

export const MovieMinimumAvailabilitySchema = z.enum([
  "tba",
  "announced",
  "inCinemas",
  "released",
]);
export type MovieMinimumAvailability = z.infer<typeof MovieMinimumAvailabilitySchema>;

export const MOVIE_MINIMUM_AVAILABILITY_OPTIONS: Array<{
  value: MovieMinimumAvailability;
  label: string;
}> = [
  { value: "tba", label: "TBA" },
  { value: "announced", label: "Announced" },
  { value: "inCinemas", label: "In Cinemas" },
  { value: "released", label: "Released" },
];

export const MovieRootFolderSchema = z.object({
  id: z.number().int(),
  path: z.string(),
  /** Bytes free from Arr; omitted when Arr returns null/undefined. */
  freeSpace: z.number().optional(),
});
export type MovieRootFolder = z.infer<typeof MovieRootFolderSchema>;

export const MovieEditOptionsSchema = z.object({
  qualityProfiles: z.array(z.object({ id: z.number().int(), name: z.string() })),
  tags: z.array(z.object({ id: z.number().int(), label: z.string() })),
  rootFolders: z.array(MovieRootFolderSchema),
});
export type MovieEditOptions = z.infer<typeof MovieEditOptionsSchema>;

export const MovieDetailSchema = z.object({
  instanceId: z.string(),
  externalId: z.number().int(),
  title: z.string(),
  year: z.number().int().optional(),
  monitored: z.boolean(),
  minimumAvailability: MovieMinimumAvailabilitySchema,
  qualityProfileId: z.number().int(),
  path: z.string(),
  tagIds: z.array(z.number().int()),
  tmdbId: z.number().int().optional(),
  imdbId: z.string().optional(),
  youTubeTrailerId: z.string().optional(),
});
export type MovieDetail = z.infer<typeof MovieDetailSchema>;

export const MovieFileSchema = z.object({
  id: z.number().int(),
  relativePath: z.string(),
  size: z.number().nonnegative().optional(),
  videoCodec: z.string().optional(),
  audioInfo: z.string().optional(),
  languages: z.array(z.string()).default([]),
  quality: z.string().optional(),
  releaseGroup: z.string().optional(),
  customFormats: z.array(z.string()).default([]),
  customFormatScore: z.number().int().optional(),
});
export type MovieFile = z.infer<typeof MovieFileSchema>;

export const MovieExtraFileSchema = z.object({
  id: z.number().int(),
  relativePath: z.string(),
  extension: z.string().optional(),
  type: z.string(),
});
export type MovieExtraFile = z.infer<typeof MovieExtraFileSchema>;

export const MovieCreditSchema = z.object({
  id: z.number().int(),
  type: z.enum(["cast", "crew"]),
  personName: z.string(),
  character: z.string().optional(),
  job: z.string().optional(),
  order: z.number().int().optional(),
  personTmdbId: z.number().int().optional(),
  headshotUrl: z.string().optional(),
});
export type MovieCredit = z.infer<typeof MovieCreditSchema>;

export const MovieAlternativeTitleSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  sourceType: z.string(),
});
export type MovieAlternativeTitle = z.infer<typeof MovieAlternativeTitleSchema>;

/** Rich detail for the movie page; includes edit fields. */
export const MoviePageDetailSchema = MovieDetailSchema.extend({
  overview: z.string().optional(),
  runtime: z.number().int().optional(),
  genres: z.array(z.string()).default([]),
  studio: z.string().optional(),
  certification: z.string().optional(),
  originalLanguage: z.string().optional(),
  collection: z.string().optional(),
  qualityProfileName: z.string().optional(),
  hasFile: z.boolean(),
  sizeOnDisk: z.number().nonnegative().optional(),
  availability: z.enum(["downloaded", "missing", "unavailable", "unmonitored"]),
  tmdbRating: z.number().optional(),
  imdbRating: z.number().optional(),
  tomatoRating: z.number().optional(),
  traktRating: z.number().optional(),
  posterUrl: z.string().optional(),
  fanartUrl: z.string().optional(),
  files: z.array(MovieFileSchema).default([]),
  extraFiles: z.array(MovieExtraFileSchema).default([]),
  cast: z.array(MovieCreditSchema).default([]),
  crew: z.array(MovieCreditSchema).default([]),
  alternativeTitles: z.array(MovieAlternativeTitleSchema).default([]),
});
export type MoviePageDetail = z.infer<typeof MoviePageDetailSchema>;

export const MovieUpdateRequestSchema = z.object({
  monitored: z.boolean(),
  minimumAvailability: MovieMinimumAvailabilitySchema,
  qualityProfileId: z.number().int(),
  path: z.string().min(1),
  tagIds: z.array(z.number().int()),
});
export type MovieUpdateRequest = z.infer<typeof MovieUpdateRequestSchema>;

export const MovieLinkSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string().url(),
});
export type MovieLink = z.infer<typeof MovieLinkSchema>;

export const MovieHistoryEventTypeSchema = z.enum([
  "unknown",
  "grabbed",
  "downloadFolderImported",
  "downloadFailed",
  "movieFileDeleted",
  "movieFolderImported",
  "movieFileRenamed",
  "downloadIgnored",
]);
export type MovieHistoryEventType = z.infer<typeof MovieHistoryEventTypeSchema>;

export const MovieHistoryEventSchema = z.object({
  id: z.number().int(),
  eventType: MovieHistoryEventTypeSchema,
  sourceTitle: z.string(),
  languages: z.array(z.string()).default([]),
  quality: z.string().optional(),
  customFormats: z.array(z.string()).default([]),
  customFormatScore: z.number().int().optional(),
  date: z.string(),
  /** Present for grab/fail/ignore style events (Radarr `downloadId`). */
  downloadId: z.string().optional(),
  /**
   * Event-specific key/value bag from Radarr `history.data`.
   * Keys vary by eventType (reason, size, sourcePath, droppedPath, …).
   */
  data: z.record(z.string(), z.string()).default({}),
});
export type MovieHistoryEvent = z.infer<typeof MovieHistoryEventSchema>;

export const MovieReleaseProtocolSchema = z.enum(["unknown", "usenet", "torrent"]);
export type MovieReleaseProtocol = z.infer<typeof MovieReleaseProtocolSchema>;

/** Quality model subset needed to POST override grabs back to Radarr. */
export const MovieReleaseQualitySchema = z.object({
  quality: z.object({
    id: z.number().int(),
    name: z.string(),
    source: z.string().optional(),
    resolution: z.number().int().optional(),
    modifier: z.string().optional(),
  }),
  revision: z
    .object({
      version: z.number().int().default(1),
      real: z.number().int().default(0),
      isRepack: z.boolean().default(false),
    })
    .default({ version: 1, real: 0, isRepack: false }),
});
export type MovieReleaseQuality = z.infer<typeof MovieReleaseQualitySchema>;

export const MovieReleaseLanguageSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});
export type MovieReleaseLanguage = z.infer<typeof MovieReleaseLanguageSchema>;

export const MovieReleaseSchema = z.object({
  guid: z.string(),
  protocol: MovieReleaseProtocolSchema,
  age: z.number().default(0),
  ageHours: z.number().default(0),
  ageMinutes: z.number().default(0),
  publishDate: z.string().optional(),
  title: z.string(),
  infoUrl: z.string().optional(),
  indexerId: z.number().int(),
  indexer: z.string(),
  size: z.number().optional(),
  seeders: z.number().int().optional(),
  leechers: z.number().int().optional(),
  quality: MovieReleaseQualitySchema.optional(),
  qualityName: z.string().optional(),
  languages: z.array(MovieReleaseLanguageSchema).default([]),
  customFormats: z.array(z.string()).default([]),
  customFormatScore: z.number().int().default(0),
  indexerFlags: z.array(z.string()).default([]),
  rejections: z.array(z.string()).default([]),
  approved: z.boolean().default(false),
  rejected: z.boolean().default(false),
  downloadAllowed: z.boolean().default(false),
});
export type MovieRelease = z.infer<typeof MovieReleaseSchema>;

export const MovieReleaseGrabRequestSchema = z.object({
  guid: z.string().min(1),
  indexerId: z.number().int(),
  movieId: z.number().int().optional(),
  shouldOverride: z.boolean().optional(),
  quality: MovieReleaseQualitySchema.optional(),
  languages: z.array(MovieReleaseLanguageSchema).optional(),
});
export type MovieReleaseGrabRequest = z.infer<typeof MovieReleaseGrabRequestSchema>;

export const MovieBlocklistItemSchema = z.object({
  id: z.number().int(),
  sourceTitle: z.string(),
  date: z.string(),
});
export type MovieBlocklistItem = z.infer<typeof MovieBlocklistItemSchema>;

/** Row from GET /api/v3/rename — only files that would change. */
export const MovieRenamePreviewSchema = z.object({
  movieId: z.number().int(),
  movieFileId: z.number().int(),
  existingPath: z.string(),
  newPath: z.string(),
});
export type MovieRenamePreview = z.infer<typeof MovieRenamePreviewSchema>;

/** Subset of GET /api/v3/config/naming used by Organize & Rename modal. */
export const MovieNamingConfigSchema = z.object({
  renameMovies: z.boolean(),
  standardMovieFormat: z.string(),
});
export type MovieNamingConfig = z.infer<typeof MovieNamingConfigSchema>;

export const MovieOrganizeRequestSchema = z.object({
  files: z.array(z.number().int()).min(1),
});
export type MovieOrganizeRequest = z.infer<typeof MovieOrganizeRequestSchema>;

export const MovieQualityOptionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  source: z.string().optional(),
  resolution: z.number().int().optional(),
  modifier: z.string().optional(),
});
export type MovieQualityOption = z.infer<typeof MovieQualityOptionSchema>;

export const MovieLanguageOptionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});
export type MovieLanguageOption = z.infer<typeof MovieLanguageOptionSchema>;

export const MovieIndexerFlagOptionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});
export type MovieIndexerFlagOption = z.infer<typeof MovieIndexerFlagOptionSchema>;

/** Rich movie file row for Manage Files modal. */
export const MovieManageFileSchema = z.object({
  id: z.number().int(),
  relativePath: z.string(),
  size: z.number().optional(),
  releaseGroup: z.string().optional(),
  quality: MovieReleaseQualitySchema.optional(),
  languages: z.array(MovieReleaseLanguageSchema).default([]),
  indexerFlags: z.number().int().default(0),
  customFormatScore: z.number().int().optional(),
});
export type MovieManageFile = z.infer<typeof MovieManageFileSchema>;

export const MovieFileBulkUpdateItemSchema = z.object({
  id: z.number().int(),
  quality: MovieReleaseQualitySchema,
  languages: z.array(MovieReleaseLanguageSchema).min(1),
  releaseGroup: z.string().optional(),
  indexerFlags: z.number().int().default(0),
});
export type MovieFileBulkUpdateItem = z.infer<typeof MovieFileBulkUpdateItemSchema>;

export const MovieFileBulkUpdateRequestSchema = z.object({
  files: z.array(MovieFileBulkUpdateItemSchema).min(1),
});
export type MovieFileBulkUpdateRequest = z.infer<typeof MovieFileBulkUpdateRequestSchema>;

export const MovieFileBulkDeleteRequestSchema = z.object({
  movieFileIds: z.array(z.number().int()).min(1),
});
export type MovieFileBulkDeleteRequest = z.infer<typeof MovieFileBulkDeleteRequestSchema>;
