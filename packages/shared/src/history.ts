import { z } from "zod";

export const HistoryKindSchema = z.enum(["radarr", "sonarr", "lidarr", "prowlarr"]);
export type HistoryKind = z.infer<typeof HistoryKindSchema>;

export const HistoryEventTypeSchema = z.enum([
  "unknown",
  "grabbed",
  "downloadFolderImported",
  "downloadFailed",
  "movieFileDeleted",
  "movieFolderImported",
  "movieFileRenamed",
  "episodeFileDeleted",
  "seriesFolderImported",
  "episodeFileRenamed",
  "trackFileImported",
  "trackFileDeleted",
  "trackFileRenamed",
  "albumFolderImported",
  "artistFolderImported",
  "downloadIgnored",
  "trackFileRetagged",
  "indexerQuery",
  "indexerRss",
  "indexerAuth",
  "indexerInfo",
  "indexerDownload",
]);
export type HistoryEventType = z.infer<typeof HistoryEventTypeSchema>;

export const PROWLARR_HISTORY_EVENT_TYPES = new Set<HistoryEventType>([
  "indexerQuery",
  "indexerRss",
  "indexerAuth",
  "indexerInfo",
  "indexerDownload",
]);

export const HistoryProtocolFilterSchema = z.enum(["unknown", "usenet", "torrent"]);
export type HistoryProtocolFilter = z.infer<typeof HistoryProtocolFilterSchema>;

export const HISTORY_EVENT_TYPE_FILTER_OPTIONS: Array<{
  value: HistoryEventType | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "grabbed", label: "Grabbed" },
  { value: "downloadFolderImported", label: "Imported" },
  { value: "downloadFailed", label: "Download failed" },
  { value: "movieFileDeleted", label: "File deleted" },
  { value: "movieFileRenamed", label: "Renamed" },
  { value: "downloadIgnored", label: "Ignored" },
  { value: "indexerRss", label: "Indexer RSS" },
  { value: "indexerQuery", label: "Indexer Query" },
  { value: "indexerDownload", label: "Indexer Grab" },
  { value: "indexerAuth", label: "Indexer Auth" },
];

export const HISTORY_PROTOCOL_FILTER_OPTIONS: Array<{
  value: HistoryProtocolFilter | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "usenet", label: "Usenet" },
  { value: "torrent", label: "Torrent" },
];

export const HistoryListItemSchema = z.object({
  id: z.number().int(),
  instanceId: z.string(),
  kind: HistoryKindSchema,
  eventType: HistoryEventTypeSchema,
  sourceTitle: z.string(),
  languages: z.array(z.string()).default([]),
  quality: z.string().optional(),
  customFormats: z.array(z.string()).default([]),
  customFormatScore: z.number().int().optional(),
  date: z.string(),
  downloadId: z.string().optional(),
  data: z.record(z.string(), z.string()).default({}),
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
  trackId: z.number().int().optional(),
  trackTitle: z.string().optional(),
  indexerId: z.number().int().optional(),
  indexerName: z.string().optional(),
  successful: z.boolean().optional(),
});
export type HistoryListItem = z.infer<typeof HistoryListItemSchema>;

export const UnifiedHistoryErrorSchema = z.object({
  instanceId: z.string(),
  instanceName: z.string(),
  message: z.string(),
});
export type UnifiedHistoryError = z.infer<typeof UnifiedHistoryErrorSchema>;

export const UnifiedHistoryResponseSchema = z.object({
  items: z.array(HistoryListItemSchema),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(50),
  totalRecords: z.number().int().nonnegative().default(0),
  errors: z.array(UnifiedHistoryErrorSchema).default([]),
});
export type UnifiedHistoryResponse = z.infer<typeof UnifiedHistoryResponseSchema>;
