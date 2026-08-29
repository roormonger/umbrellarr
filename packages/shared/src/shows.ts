import { z } from "zod";
import { MediaItemSchema } from "./media.js";

export const SeriesSortKeySchema = z.enum([
  "monitoredStatus",
  "title",
  "network",
  "qualityProfile",
  "added",
  "year",
  "nextAiring",
  "previousAiring",
  "tmdbRating",
  "imdbRating",
  "traktRating",
  "path",
  "sizeOnDisk",
  "certification",
  "originalLanguage",
  "episodeProgress",
  "seasonCount",
  "tags",
]);
export type SeriesSortKey = z.infer<typeof SeriesSortKeySchema>;

export const SeriesSortDirectionSchema = z.enum(["asc", "desc"]);
export type SeriesSortDirection = z.infer<typeof SeriesSortDirectionSchema>;

export const SeriesFilterKeySchema = z.enum([
  "all",
  "monitored",
  "unmonitored",
  "missing",
  "wanted",
  "cutoffUnmet",
]);
export type SeriesFilterKey = z.infer<typeof SeriesFilterKeySchema>;

export const SeriesListItemSchema = MediaItemSchema.extend({
  kind: z.literal("series"),
  network: z.string().optional(),
  qualityProfileId: z.number().int().optional(),
  qualityProfileName: z.string().optional(),
  added: z.string().optional(),
  nextAiring: z.string().optional(),
  previousAiring: z.string().optional(),
  tmdbRating: z.number().optional(),
  imdbRating: z.number().optional(),
  traktRating: z.number().optional(),
  path: z.string().optional(),
  sizeOnDisk: z.number().nonnegative().optional(),
  certification: z.string().optional(),
  originalLanguage: z.string().optional(),
  seasonCount: z.number().int().optional(),
  tags: z.array(z.string()).default([]),
  cutoffUnmet: z.boolean().default(false),
  tvMazeId: z.number().int().optional(),
  imdbId: z.string().optional(),
});
export type SeriesListItem = z.infer<typeof SeriesListItemSchema>;

export const SERIES_SORT_OPTIONS: Array<{ value: SeriesSortKey; label: string }> = [
  { value: "monitoredStatus", label: "Monitored/Status" },
  { value: "title", label: "Title" },
  { value: "network", label: "Network" },
  { value: "qualityProfile", label: "Quality Profile" },
  { value: "added", label: "Added" },
  { value: "year", label: "Year" },
  { value: "nextAiring", label: "Next Airing" },
  { value: "previousAiring", label: "Previous Airing" },
  { value: "tmdbRating", label: "TMDb Rating" },
  { value: "imdbRating", label: "IMDb Rating" },
  { value: "traktRating", label: "Trakt Rating" },
  { value: "path", label: "Path" },
  { value: "sizeOnDisk", label: "Size on Disk" },
  { value: "certification", label: "Certification" },
  { value: "originalLanguage", label: "Original Language" },
  { value: "episodeProgress", label: "Episode Progress" },
  { value: "seasonCount", label: "Seasons" },
  { value: "tags", label: "Tags" },
];

export const SERIES_FILTER_OPTIONS: Array<{ value: SeriesFilterKey; label: string }> = [
  { value: "all", label: "All" },
  { value: "monitored", label: "Monitored Only" },
  { value: "unmonitored", label: "Unmonitored" },
  { value: "missing", label: "Missing" },
  { value: "wanted", label: "Wanted" },
  { value: "cutoffUnmet", label: "Cutoff Unmet" },
];

export const SeriesTypeSchema = z.enum(["standard", "daily", "anime"]);
export type SeriesType = z.infer<typeof SeriesTypeSchema>;

export const SERIES_TYPE_OPTIONS: Array<{ value: SeriesType; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "daily", label: "Daily" },
  { value: "anime", label: "Anime" },
];

export const SeriesMonitorNewItemsSchema = z.enum(["all", "none"]);
export type SeriesMonitorNewItems = z.infer<typeof SeriesMonitorNewItemsSchema>;

export const SERIES_MONITOR_NEW_ITEMS_OPTIONS: Array<{
  value: SeriesMonitorNewItems;
  label: string;
}> = [
  { value: "all", label: "All episodes" },
  { value: "none", label: "None" },
];

export const SeriesRootFolderSchema = z.object({
  id: z.number().int(),
  path: z.string(),
  freeSpace: z.number().optional(),
});
export type SeriesRootFolder = z.infer<typeof SeriesRootFolderSchema>;

export const SeriesEditOptionsSchema = z.object({
  qualityProfiles: z.array(z.object({ id: z.number().int(), name: z.string() })),
  tags: z.array(z.object({ id: z.number().int(), label: z.string() })),
  rootFolders: z.array(SeriesRootFolderSchema),
});
export type SeriesEditOptions = z.infer<typeof SeriesEditOptionsSchema>;

export const SeriesDetailSchema = z.object({
  instanceId: z.string(),
  externalId: z.number().int(),
  title: z.string(),
  year: z.number().int().optional(),
  monitored: z.boolean(),
  monitorNewItems: SeriesMonitorNewItemsSchema,
  seriesType: SeriesTypeSchema,
  seasonFolder: z.boolean(),
  qualityProfileId: z.number().int(),
  path: z.string(),
  tagIds: z.array(z.number().int()),
  tmdbId: z.number().int().optional(),
  tvdbId: z.number().int().optional(),
  tvMazeId: z.number().int().optional(),
  imdbId: z.string().optional(),
  youTubeTrailerId: z.string().optional(),
});
export type SeriesDetail = z.infer<typeof SeriesDetailSchema>;

/** Rich detail for the show page hero (no seasons/episodes yet). */
export const SeriesPageDetailSchema = SeriesDetailSchema.extend({
  overview: z.string().optional(),
  runtime: z.number().int().optional(),
  genres: z.array(z.string()).default([]),
  network: z.string().optional(),
  certification: z.string().optional(),
  originalLanguage: z.string().optional(),
  qualityProfileName: z.string().optional(),
  sizeOnDisk: z.number().nonnegative().optional(),
  seasonCount: z.number().int().optional(),
  episodeCount: z.number().int().optional(),
  episodeFileCount: z.number().int().optional(),
  availability: z.enum(["downloaded", "missing", "unavailable", "unmonitored"]),
  tmdbRating: z.number().optional(),
  imdbRating: z.number().optional(),
  traktRating: z.number().optional(),
  posterUrl: z.string().optional(),
  fanartUrl: z.string().optional(),
  nextAiring: z.string().optional(),
  previousAiring: z.string().optional(),
  status: z.string().optional(),
});
export type SeriesPageDetail = z.infer<typeof SeriesPageDetailSchema>;

export const SeriesUpdateRequestSchema = z.object({
  monitored: z.boolean(),
  monitorNewItems: SeriesMonitorNewItemsSchema,
  seriesType: SeriesTypeSchema,
  seasonFolder: z.boolean(),
  qualityProfileId: z.number().int(),
  path: z.string().min(1),
  tagIds: z.array(z.number().int()),
});
export type SeriesUpdateRequest = z.infer<typeof SeriesUpdateRequestSchema>;

export const SeriesLinkSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string().url(),
});
export type SeriesLink = z.infer<typeof SeriesLinkSchema>;

export const SeriesHistoryEventTypeSchema = z.enum([
  "unknown",
  "grabbed",
  "downloadFolderImported",
  "downloadFailed",
  "episodeFileDeleted",
  "seriesFolderImported",
  "episodeFileRenamed",
  "downloadIgnored",
]);
export type SeriesHistoryEventType = z.infer<typeof SeriesHistoryEventTypeSchema>;

export const SeriesHistoryEventSchema = z.object({
  id: z.number().int(),
  eventType: SeriesHistoryEventTypeSchema,
  sourceTitle: z.string(),
  languages: z.array(z.string()).default([]),
  quality: z.string().optional(),
  customFormats: z.array(z.string()).default([]),
  customFormatScore: z.number().int().optional(),
  date: z.string(),
  downloadId: z.string().optional(),
  /**
   * Event-specific key/value bag from Sonarr `history.data`.
   * Keys vary by eventType (reason, size, sourcePath, droppedPath, …).
   */
  data: z.record(z.string(), z.string()).default({}),
});
export type SeriesHistoryEvent = z.infer<typeof SeriesHistoryEventSchema>;

export const SeriesReleaseProtocolSchema = z.enum(["unknown", "usenet", "torrent"]);
export type SeriesReleaseProtocol = z.infer<typeof SeriesReleaseProtocolSchema>;

/** Quality model subset needed to POST override grabs back to Sonarr. */
export const SeriesReleaseQualitySchema = z.object({
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
export type SeriesReleaseQuality = z.infer<typeof SeriesReleaseQualitySchema>;

export const SeriesReleaseLanguageSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});
export type SeriesReleaseLanguage = z.infer<typeof SeriesReleaseLanguageSchema>;

export const SeriesReleaseSchema = z.object({
  guid: z.string(),
  protocol: SeriesReleaseProtocolSchema,
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
  quality: SeriesReleaseQualitySchema.optional(),
  qualityName: z.string().optional(),
  languages: z.array(SeriesReleaseLanguageSchema).default([]),
  customFormats: z.array(z.string()).default([]),
  customFormatScore: z.number().int().default(0),
  indexerFlags: z.array(z.string()).default([]),
  rejections: z.array(z.string()).default([]),
  approved: z.boolean().default(false),
  rejected: z.boolean().default(false),
  downloadAllowed: z.boolean().default(false),
});
export type SeriesRelease = z.infer<typeof SeriesReleaseSchema>;

export const SeriesReleaseGrabRequestSchema = z.object({
  guid: z.string().min(1),
  indexerId: z.number().int(),
  seriesId: z.number().int().optional(),
  shouldOverride: z.boolean().optional(),
  quality: SeriesReleaseQualitySchema.optional(),
  languages: z.array(SeriesReleaseLanguageSchema).optional(),
});
export type SeriesReleaseGrabRequest = z.infer<typeof SeriesReleaseGrabRequestSchema>;

export const SeriesBlocklistItemSchema = z.object({
  id: z.number().int(),
  sourceTitle: z.string(),
  date: z.string(),
});
export type SeriesBlocklistItem = z.infer<typeof SeriesBlocklistItemSchema>;

/** Row from GET /api/v3/rename — only files that would change. */
export const SeriesRenamePreviewSchema = z.object({
  seriesId: z.number().int(),
  episodeFileId: z.number().int(),
  existingPath: z.string(),
  newPath: z.string(),
});
export type SeriesRenamePreview = z.infer<typeof SeriesRenamePreviewSchema>;

/** Subset of GET /api/v3/config/naming used by Organize & Rename modal. */
export const SeriesNamingConfigSchema = z.object({
  renameEpisodes: z.boolean(),
  standardEpisodeFormat: z.string(),
  dailyEpisodeFormat: z.string(),
  animeEpisodeFormat: z.string(),
});
export type SeriesNamingConfig = z.infer<typeof SeriesNamingConfigSchema>;

export const SeriesOrganizeRequestSchema = z.object({
  files: z.array(z.number().int()).min(1),
});
export type SeriesOrganizeRequest = z.infer<typeof SeriesOrganizeRequestSchema>;

export const SeriesQualityOptionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  source: z.string().optional(),
  resolution: z.number().int().optional(),
  modifier: z.string().optional(),
});
export type SeriesQualityOption = z.infer<typeof SeriesQualityOptionSchema>;

export const SeriesLanguageOptionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});
export type SeriesLanguageOption = z.infer<typeof SeriesLanguageOptionSchema>;

export const SeriesIndexerFlagOptionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});
export type SeriesIndexerFlagOption = z.infer<typeof SeriesIndexerFlagOptionSchema>;

/** Rich episode file row for Manage Files modal. */
export const SeriesManageFileSchema = z.object({
  id: z.number().int(),
  relativePath: z.string(),
  size: z.number().optional(),
  releaseGroup: z.string().optional(),
  quality: SeriesReleaseQualitySchema.optional(),
  languages: z.array(SeriesReleaseLanguageSchema).default([]),
  indexerFlags: z.number().int().default(0),
  customFormatScore: z.number().int().optional(),
});
export type SeriesManageFile = z.infer<typeof SeriesManageFileSchema>;

export const SeriesFileBulkUpdateItemSchema = z.object({
  id: z.number().int(),
  quality: SeriesReleaseQualitySchema,
  languages: z.array(SeriesReleaseLanguageSchema).min(1),
  releaseGroup: z.string().optional(),
  indexerFlags: z.number().int().default(0),
});
export type SeriesFileBulkUpdateItem = z.infer<typeof SeriesFileBulkUpdateItemSchema>;

export const SeriesFileBulkUpdateRequestSchema = z.object({
  files: z.array(SeriesFileBulkUpdateItemSchema).min(1),
});
export type SeriesFileBulkUpdateRequest = z.infer<typeof SeriesFileBulkUpdateRequestSchema>;

export const SeriesFileBulkDeleteRequestSchema = z.object({
  episodeFileIds: z.array(z.number().int()).min(1),
});
export type SeriesFileBulkDeleteRequest = z.infer<typeof SeriesFileBulkDeleteRequestSchema>;
