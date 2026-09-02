import { z } from "zod";
import { ArrKindSchema } from "./instances.js";
import { MovieReleaseLanguageSchema, MovieReleaseQualitySchema } from "./movies.js";

export const QueueProtocolSchema = z.enum(["unknown", "usenet", "torrent"]);
export type QueueProtocol = z.infer<typeof QueueProtocolSchema>;

export const QueueStatusFilterSchema = z.enum([
  "all",
  "downloading",
  "paused",
  "queued",
  "completed",
  "warning",
  "failed",
  "delay",
]);
export type QueueStatusFilter = z.infer<typeof QueueStatusFilterSchema>;

export const QUEUE_STATUS_FILTER_OPTIONS: Array<{ value: QueueStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "downloading", label: "Downloading" },
  { value: "paused", label: "Paused" },
  { value: "queued", label: "Queued" },
  { value: "completed", label: "Completed" },
  { value: "warning", label: "Warning" },
  { value: "failed", label: "Failed" },
  { value: "delay", label: "Delay" },
];

export const QUEUE_PROTOCOL_FILTER_OPTIONS: Array<{ value: QueueProtocol | "all"; label: string }> =
  [
    { value: "all", label: "All" },
    { value: "usenet", label: "Usenet" },
    { value: "torrent", label: "Torrent" },
  ];

export const QueueStatusMessageSchema = z.object({
  title: z.string().optional(),
  messages: z.array(z.string()).default([]),
});
export type QueueStatusMessage = z.infer<typeof QueueStatusMessageSchema>;

export const QueueListItemSchema = z.object({
  id: z.number().int(),
  instanceId: z.string(),
  kind: ArrKindSchema,
  title: z.string(),
  movieId: z.number().int().optional(),
  movieTitle: z.string().optional(),
  year: z.number().int().optional(),
  seriesId: z.number().int().optional(),
  seriesTitle: z.string().optional(),
  episodeId: z.number().int().optional(),
  seasonNumber: z.number().int().optional(),
  episodeNumber: z.number().int().optional(),
  episodeTitle: z.string().optional(),
  artistId: z.number().int().optional(),
  artistName: z.string().optional(),
  albumId: z.number().int().optional(),
  albumTitle: z.string().optional(),
  languages: z.array(z.string()).default([]),
  qualityName: z.string().optional(),
  customFormats: z.array(z.string()).default([]),
  customFormatScore: z.number().int().optional(),
  size: z.number().nonnegative().optional(),
  sizeleft: z.number().nonnegative().optional(),
  timeleft: z.string().optional(),
  estimatedCompletionTime: z.string().optional(),
  status: z.string().optional(),
  trackedDownloadStatus: z.string().optional(),
  trackedDownloadState: z.string().optional(),
  statusMessages: z.array(QueueStatusMessageSchema).default([]),
  errorMessage: z.string().optional(),
  protocol: QueueProtocolSchema.default("unknown"),
  indexer: z.string().optional(),
  downloadClient: z.string().optional(),
  downloadClientHasPostImportCategory: z.boolean().default(false),
  downloadId: z.string().optional(),
  outputPath: z.string().optional(),
  /** True when Arr allows grab (delay / downloadClientUnavailable). */
  canGrab: z.boolean().default(false),
  /** True when Manual Import is useful (has downloadId and completed/warning). */
  canManualImport: z.boolean().default(false),
  /** Pending items cannot use blocklist+search / ignore in Arr remove modal. */
  isPending: z.boolean().default(false),
});
export type QueueListItem = z.infer<typeof QueueListItemSchema>;

export const QueueStatusSchema = z.object({
  totalCount: z.number().int().nonnegative().default(0),
  count: z.number().int().nonnegative().default(0),
  unknownCount: z.number().int().nonnegative().default(0),
  errors: z.boolean().default(false),
  warnings: z.boolean().default(false),
});
export type QueueStatus = z.infer<typeof QueueStatusSchema>;

export const QueueListResponseSchema = z.object({
  items: z.array(QueueListItemSchema),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
  totalRecords: z.number().int().nonnegative().default(0),
  status: QueueStatusSchema.optional(),
});
export type QueueListResponse = z.infer<typeof QueueListResponseSchema>;

export const QueueRemovalMethodSchema = z.enum([
  "removeFromClient",
  "changeCategory",
  "ignore",
]);
export type QueueRemovalMethod = z.infer<typeof QueueRemovalMethodSchema>;

export const QueueBlocklistModeSchema = z.enum([
  "doNotBlocklist",
  "blocklistAndSearch",
  "blocklistOnly",
]);
export type QueueBlocklistMode = z.infer<typeof QueueBlocklistModeSchema>;

export const QueueRemoveRequestSchema = z.object({
  ids: z.array(z.number().int()).min(1),
  removalMethod: QueueRemovalMethodSchema.default("removeFromClient"),
  blocklistMode: QueueBlocklistModeSchema.default("doNotBlocklist"),
});
export type QueueRemoveRequest = z.infer<typeof QueueRemoveRequestSchema>;

export const QueueGrabRequestSchema = z.object({
  ids: z.array(z.number().int()).min(1),
});
export type QueueGrabRequest = z.infer<typeof QueueGrabRequestSchema>;

export const QueueManualImportRejectionSchema = z.object({
  reason: z.string().optional(),
  type: z.string().optional(),
});
export type QueueManualImportRejection = z.infer<typeof QueueManualImportRejectionSchema>;

export const QueueManualImportItemSchema = z.object({
  id: z.number().int(),
  path: z.string(),
  relativePath: z.string().optional(),
  name: z.string().optional(),
  size: z.number().nonnegative().optional(),
  downloadId: z.string().optional(),
  movieId: z.number().int().optional(),
  movieTitle: z.string().optional(),
  seriesId: z.number().int().optional(),
  seriesTitle: z.string().optional(),
  seasonNumber: z.number().int().optional(),
  episodeIds: z.array(z.number().int()).default([]),
  episodeLabel: z.string().optional(),
  artistId: z.number().int().optional(),
  artistName: z.string().optional(),
  albumId: z.number().int().optional(),
  albumTitle: z.string().optional(),
  quality: MovieReleaseQualitySchema.optional(),
  qualityName: z.string().optional(),
  languages: z.array(MovieReleaseLanguageSchema).default([]),
  releaseGroup: z.string().optional(),
  indexerFlags: z.number().int().default(0),
  releaseType: z.string().optional(),
  rejections: z.array(QueueManualImportRejectionSchema).default([]),
});
export type QueueManualImportItem = z.infer<typeof QueueManualImportItemSchema>;

export const QueueManualImportUpdateItemSchema = z.object({
  id: z.number().int(),
  path: z.string().min(1),
  downloadId: z.string().optional(),
  movieId: z.number().int().optional(),
  seriesId: z.number().int().optional(),
  seasonNumber: z.number().int().optional(),
  episodeIds: z.array(z.number().int()).optional(),
  artistId: z.number().int().optional(),
  albumId: z.number().int().optional(),
  quality: MovieReleaseQualitySchema.optional(),
  languages: z.array(MovieReleaseLanguageSchema).optional(),
  releaseGroup: z.string().optional(),
  indexerFlags: z.number().int().optional(),
  releaseType: z.string().optional(),
});
export type QueueManualImportUpdateItem = z.infer<typeof QueueManualImportUpdateItemSchema>;

export const QueueManualImportUpdateRequestSchema = z.object({
  files: z.array(QueueManualImportUpdateItemSchema).min(1),
});
export type QueueManualImportUpdateRequest = z.infer<typeof QueueManualImportUpdateRequestSchema>;

export const UnifiedQueueErrorSchema = z.object({
  instanceId: z.string(),
  instanceName: z.string(),
  message: z.string(),
});
export type UnifiedQueueError = z.infer<typeof UnifiedQueueErrorSchema>;

export const UnifiedQueueResponseSchema = z.object({
  items: z.array(QueueListItemSchema),
  totalRecords: z.number().int().nonnegative().default(0),
  status: QueueStatusSchema.optional(),
  errors: z.array(UnifiedQueueErrorSchema).default([]),
});
export type UnifiedQueueResponse = z.infer<typeof UnifiedQueueResponseSchema>;
