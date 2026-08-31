import { z } from "zod";
import { AvailabilitySchema, MediaItemSchema } from "./media.js";

export const ArtistSortKeySchema = z.enum([
  "monitoredStatus",
  "title",
  "qualityProfile",
  "metadataProfile",
  "added",
  "path",
  "sizeOnDisk",
  "trackProgress",
  "albumCount",
  "tags",
]);
export type ArtistSortKey = z.infer<typeof ArtistSortKeySchema>;

export const ArtistSortDirectionSchema = z.enum(["asc", "desc"]);
export type ArtistSortDirection = z.infer<typeof ArtistSortDirectionSchema>;

export const ArtistFilterKeySchema = z.enum([
  "all",
  "monitored",
  "unmonitored",
  "missing",
  "wanted",
  "cutoffUnmet",
]);
export type ArtistFilterKey = z.infer<typeof ArtistFilterKeySchema>;

export const ArtistListItemSchema = MediaItemSchema.extend({
  kind: z.literal("artist"),
  qualityProfileId: z.number().int().optional(),
  qualityProfileName: z.string().optional(),
  metadataProfileId: z.number().int().optional(),
  metadataProfileName: z.string().optional(),
  added: z.string().optional(),
  path: z.string().optional(),
  sizeOnDisk: z.number().nonnegative().optional(),
  albumCount: z.number().int().optional(),
  trackCount: z.number().int().optional(),
  trackFileCount: z.number().int().optional(),
  tags: z.array(z.string()).default([]),
  cutoffUnmet: z.boolean().default(false),
  genres: z.array(z.string()).default([]),
  foreignArtistId: z.string().optional(),
  status: z.string().optional(),
});
export type ArtistListItem = z.infer<typeof ArtistListItemSchema>;

export const ARTIST_SORT_OPTIONS: Array<{ value: ArtistSortKey; label: string }> = [
  { value: "monitoredStatus", label: "Monitored/Status" },
  { value: "title", label: "Title" },
  { value: "qualityProfile", label: "Quality Profile" },
  { value: "metadataProfile", label: "Metadata Profile" },
  { value: "added", label: "Added" },
  { value: "path", label: "Path" },
  { value: "sizeOnDisk", label: "Size on Disk" },
  { value: "trackProgress", label: "Track Progress" },
  { value: "albumCount", label: "Albums" },
  { value: "tags", label: "Tags" },
];

export const ARTIST_FILTER_OPTIONS: Array<{ value: ArtistFilterKey; label: string }> = [
  { value: "all", label: "All" },
  { value: "monitored", label: "Monitored Only" },
  { value: "unmonitored", label: "Unmonitored" },
  { value: "missing", label: "Missing" },
  { value: "wanted", label: "Wanted" },
  { value: "cutoffUnmet", label: "Cutoff Unmet" },
];

export const ArtistMonitorNewItemsSchema = z.enum(["all", "new", "none"]);
export type ArtistMonitorNewItems = z.infer<typeof ArtistMonitorNewItemsSchema>;

export const ARTIST_MONITOR_NEW_ITEMS_OPTIONS: Array<{
  value: ArtistMonitorNewItems;
  label: string;
}> = [
  { value: "all", label: "All Albums" },
  { value: "new", label: "New Albums" },
  { value: "none", label: "None" },
];

export const ArtistRootFolderSchema = z.object({
  id: z.number().int(),
  path: z.string(),
  freeSpace: z.number().optional(),
});
export type ArtistRootFolder = z.infer<typeof ArtistRootFolderSchema>;

export const ArtistEditOptionsSchema = z.object({
  qualityProfiles: z.array(z.object({ id: z.number().int(), name: z.string() })),
  metadataProfiles: z.array(z.object({ id: z.number().int(), name: z.string() })),
  tags: z.array(z.object({ id: z.number().int(), label: z.string() })),
  rootFolders: z.array(ArtistRootFolderSchema),
});
export type ArtistEditOptions = z.infer<typeof ArtistEditOptionsSchema>;

export const ArtistDetailSchema = z.object({
  instanceId: z.string(),
  externalId: z.number().int(),
  title: z.string(),
  monitored: z.boolean(),
  monitorNewItems: ArtistMonitorNewItemsSchema,
  qualityProfileId: z.number().int(),
  metadataProfileId: z.number().int(),
  path: z.string(),
  tagIds: z.array(z.number().int()),
  foreignArtistId: z.string().optional(),
});
export type ArtistDetail = z.infer<typeof ArtistDetailSchema>;

export const ArtistUpdateRequestSchema = z.object({
  monitored: z.boolean(),
  monitorNewItems: ArtistMonitorNewItemsSchema,
  qualityProfileId: z.number().int(),
  metadataProfileId: z.number().int(),
  path: z.string().min(1),
  tagIds: z.array(z.number().int()),
});
export type ArtistUpdateRequest = z.infer<typeof ArtistUpdateRequestSchema>;

export const ArtistLinkSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string().url(),
});
export type ArtistLink = z.infer<typeof ArtistLinkSchema>;

/** Rich detail for the artist page hero. */
export const ArtistPageDetailSchema = ArtistDetailSchema.extend({
  overview: z.string().optional(),
  genres: z.array(z.string()).default([]),
  qualityProfileName: z.string().optional(),
  metadataProfileName: z.string().optional(),
  sizeOnDisk: z.number().nonnegative().optional(),
  albumCount: z.number().int().optional(),
  trackCount: z.number().int().optional(),
  trackFileCount: z.number().int().optional(),
  availability: AvailabilitySchema,
  rating: z.number().optional(),
  posterUrl: z.string().optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).default([]),
  albumTypes: z.array(z.string()).default([]),
});
export type ArtistPageDetail = z.infer<typeof ArtistPageDetailSchema>;

export const ArtistAlbumStatisticsSchema = z.object({
  trackCount: z.number().int().optional(),
  trackFileCount: z.number().int().optional(),
  totalTrackCount: z.number().int().optional(),
  sizeOnDisk: z.number().nonnegative().optional(),
});
export type ArtistAlbumStatistics = z.infer<typeof ArtistAlbumStatisticsSchema>;

export const ArtistAlbumSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  albumType: z.string(),
  releaseDate: z.string().optional(),
  monitored: z.boolean(),
  rating: z.number().optional(),
  foreignAlbumId: z.string().optional(),
  coverUrl: z.string().optional(),
  statistics: ArtistAlbumStatisticsSchema.default({}),
});
export type ArtistAlbum = z.infer<typeof ArtistAlbumSchema>;

export const ArtistAlbumTypeGroupSchema = z.object({
  albumType: z.string(),
  albums: z.array(ArtistAlbumSchema),
});
export type ArtistAlbumTypeGroup = z.infer<typeof ArtistAlbumTypeGroupSchema>;

/** One track row in the album tracks modal (Lidarr album detail table). */
export const ArtistAlbumTrackSchema = z.object({
  id: z.number().int(),
  trackFileId: z.number().int().optional(),
  trackNumber: z.string(),
  absoluteTrackNumber: z.number().int().optional(),
  mediumNumber: z.number().int().optional(),
  mediumCount: z.number().int().optional(),
  title: z.string(),
  durationMs: z.number().int().optional(),
  hasFile: z.boolean(),
  quality: z.string().optional(),
  audioInfo: z.string().optional(),
  status: z.string().optional(),
  relativePath: z.string().optional(),
  path: z.string().optional(),
  country: z.string().optional(),
  year: z.number().int().optional(),
  label: z.string().optional(),
  foreignArtistId: z.string().optional(),
  foreignAlbumId: z.string().optional(),
  foreignReleaseId: z.string().optional(),
  foreignRecordingId: z.string().optional(),
  foreignTrackId: z.string().optional(),
});
export type ArtistAlbumTrack = z.infer<typeof ArtistAlbumTrackSchema>;

export const ArtistAlbumTracksResponseSchema = z.object({
  album: ArtistAlbumSchema,
  artistName: z.string(),
  tracks: z.array(ArtistAlbumTrackSchema),
});
export type ArtistAlbumTracksResponse = z.infer<typeof ArtistAlbumTracksResponseSchema>;

export const ArtistAlbumsMonitorRequestSchema = z.object({
  albumIds: z.array(z.number().int()).min(1),
  monitored: z.boolean(),
});
export type ArtistAlbumsMonitorRequest = z.infer<typeof ArtistAlbumsMonitorRequestSchema>;

export const ArtistHistoryEventTypeSchema = z.enum([
  "unknown",
  "grabbed",
  "trackFileImported",
  "downloadFailed",
  "trackFileDeleted",
  "trackFileRenamed",
  "albumFolderImported",
  "downloadIgnored",
  "trackFileRetagged",
  "artistFolderImported",
]);
export type ArtistHistoryEventType = z.infer<typeof ArtistHistoryEventTypeSchema>;

export const ArtistHistoryEventSchema = z.object({
  id: z.number().int(),
  eventType: ArtistHistoryEventTypeSchema,
  sourceTitle: z.string(),
  quality: z.string().optional(),
  customFormats: z.array(z.string()).default([]),
  customFormatScore: z.number().int().optional(),
  date: z.string(),
  downloadId: z.string().optional(),
  albumId: z.number().int().optional(),
  trackId: z.number().int().optional(),
  data: z.record(z.string(), z.string()).default({}),
});
export type ArtistHistoryEvent = z.infer<typeof ArtistHistoryEventSchema>;

export const ArtistReleaseProtocolSchema = z.enum(["unknown", "usenet", "torrent"]);
export type ArtistReleaseProtocol = z.infer<typeof ArtistReleaseProtocolSchema>;

export const ArtistReleaseQualitySchema = z.object({
  quality: z.object({
    id: z.number().int(),
    name: z.string(),
  }),
  revision: z
    .object({
      version: z.number().int().default(1),
      real: z.number().int().default(0),
      isRepack: z.boolean().default(false),
    })
    .default({ version: 1, real: 0, isRepack: false }),
});
export type ArtistReleaseQuality = z.infer<typeof ArtistReleaseQualitySchema>;

export const ArtistReleaseSchema = z.object({
  guid: z.string(),
  protocol: ArtistReleaseProtocolSchema,
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
  quality: ArtistReleaseQualitySchema.optional(),
  qualityName: z.string().optional(),
  customFormats: z.array(z.string()).default([]),
  customFormatScore: z.number().int().default(0),
  indexerFlags: z.array(z.string()).default([]),
  rejections: z.array(z.string()).default([]),
  approved: z.boolean().default(false),
  rejected: z.boolean().default(false),
  downloadAllowed: z.boolean().default(false),
});
export type ArtistRelease = z.infer<typeof ArtistReleaseSchema>;

export const ArtistReleaseGrabRequestSchema = z.object({
  guid: z.string().min(1),
  indexerId: z.number().int(),
  artistId: z.number().int().optional(),
  shouldOverride: z.boolean().optional(),
  quality: ArtistReleaseQualitySchema.optional(),
});
export type ArtistReleaseGrabRequest = z.infer<typeof ArtistReleaseGrabRequestSchema>;

export const ArtistBlocklistItemSchema = z.object({
  id: z.number().int(),
  sourceTitle: z.string(),
  date: z.string(),
});
export type ArtistBlocklistItem = z.infer<typeof ArtistBlocklistItemSchema>;

export const ArtistRenamePreviewSchema = z.object({
  artistId: z.number().int(),
  trackFileId: z.number().int(),
  existingPath: z.string(),
  newPath: z.string(),
  albumId: z.number().int().optional(),
});
export type ArtistRenamePreview = z.infer<typeof ArtistRenamePreviewSchema>;

export const ArtistNamingConfigSchema = z.object({
  renameTracks: z.boolean(),
  standardTrackFormat: z.string(),
  multiDiscTrackFormat: z.string().optional(),
});
export type ArtistNamingConfig = z.infer<typeof ArtistNamingConfigSchema>;

export const ArtistOrganizeRequestSchema = z.object({
  files: z.array(z.number().int()).min(1),
});
export type ArtistOrganizeRequest = z.infer<typeof ArtistOrganizeRequestSchema>;

/** Lidarr MonitorTypes used by Artist Monitoring / albumStudio. */
export const ArtistAlbumMonitorSchema = z.enum([
  "all",
  "future",
  "missing",
  "existing",
  "first",
  "latest",
  "none",
]);
export type ArtistAlbumMonitor = z.infer<typeof ArtistAlbumMonitorSchema>;

export const ARTIST_ALBUM_MONITOR_OPTIONS: Array<{
  value: ArtistAlbumMonitor;
  label: string;
}> = [
  { value: "all", label: "All Albums" },
  { value: "future", label: "Future Albums" },
  { value: "missing", label: "Missing Albums" },
  { value: "existing", label: "Existing Albums" },
  { value: "first", label: "First Album" },
  { value: "latest", label: "Latest Album" },
  { value: "none", label: "None" },
];

export const ArtistMonitoringRequestSchema = z.object({
  monitor: ArtistAlbumMonitorSchema,
});
export type ArtistMonitoringRequest = z.infer<typeof ArtistMonitoringRequestSchema>;

export const ArtistTagChangeSchema = z.object({
  field: z.string(),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
});
export type ArtistTagChange = z.infer<typeof ArtistTagChangeSchema>;

export const ArtistRetagPreviewSchema = z.object({
  trackFileId: z.number().int(),
  path: z.string(),
  changes: z.array(ArtistTagChangeSchema).default([]),
  albumId: z.number().int().optional(),
});
export type ArtistRetagPreview = z.infer<typeof ArtistRetagPreviewSchema>;

export const ArtistRetagRequestSchema = z.object({
  files: z.array(z.number().int()).min(1),
});
export type ArtistRetagRequest = z.infer<typeof ArtistRetagRequestSchema>;

export const ArtistQualityOptionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});
export type ArtistQualityOption = z.infer<typeof ArtistQualityOptionSchema>;

/** One row in Lidarr Manage Tracks (track joined to its track file). */
export const ArtistManageFileSchema = z.object({
  /** Track id — row key / selection (Lidarr TrackFileEditor). */
  id: z.number().int(),
  trackFileId: z.number().int(),
  trackNumber: z.string(),
  relativePath: z.string(),
  quality: z.string().optional(),
  qualityId: z.number().int().optional(),
  albumId: z.number().int().optional(),
});
export type ArtistManageFile = z.infer<typeof ArtistManageFileSchema>;

/** Lidarr trackfile/editor — shared metadata applied to all selected ids. */
export const ArtistFileBulkUpdateRequestSchema = z.object({
  trackFileIds: z.array(z.number().int()).min(1),
  quality: ArtistReleaseQualitySchema.optional(),
  releaseGroup: z.string().optional(),
});
export type ArtistFileBulkUpdateRequest = z.infer<typeof ArtistFileBulkUpdateRequestSchema>;

export const ArtistFileBulkDeleteRequestSchema = z.object({
  trackFileIds: z.array(z.number().int()).min(1),
});
export type ArtistFileBulkDeleteRequest = z.infer<typeof ArtistFileBulkDeleteRequestSchema>;
