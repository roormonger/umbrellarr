import { z } from "zod";
import { MediaItemSchema } from "./media.js";

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
