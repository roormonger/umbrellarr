import { z } from "zod";
import { RequestPageInfoSchema, RequestSortDirectionSchema, RequestUserSchema } from "./requests.js";

export const IssueFilterSchema = z.enum(["all", "open", "resolved"]);
export type IssueFilter = z.infer<typeof IssueFilterSchema>;

export const IssueSortSchema = z.enum(["added", "modified"]);
export type IssueSort = z.infer<typeof IssueSortSchema>;

export const IssueStatusSchema = z.enum(["open", "resolved", "unknown"]);
export type IssueStatus = z.infer<typeof IssueStatusSchema>;

export const IssueTypeSchema = z.enum(["video", "audio", "subtitles", "other", "unknown"]);
export type IssueType = z.infer<typeof IssueTypeSchema>;

export const IssueListQuerySchema = z.object({
  take: z.coerce.number().int().positive().max(100).default(25),
  skip: z.coerce.number().int().nonnegative().default(0),
  filter: IssueFilterSchema.default("open"),
  sort: IssueSortSchema.default("added"),
  sortDirection: RequestSortDirectionSchema.default("desc"),
});
export type IssueListQuery = z.infer<typeof IssueListQuerySchema>;

export const IssueListItemSchema = z.object({
  id: z.number().int(),
  instanceId: z.string().optional(),
  instanceName: z.string().optional(),
  mediaType: z.enum(["movie", "tv"]),
  tmdbId: z.number().int(),
  title: z.string(),
  year: z.string().optional(),
  posterUrl: z.string().optional(),
  backdropUrl: z.string().optional(),
  status: IssueStatusSchema,
  issueType: IssueTypeSchema,
  message: z.string().optional(),
  problemSeason: z.number().int(),
  problemEpisode: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  createdBy: RequestUserSchema.optional(),
});
export type IssueListItem = z.infer<typeof IssueListItemSchema>;

export const IssueListResponseSchema = z.object({
  pageInfo: RequestPageInfoSchema,
  results: z.array(IssueListItemSchema),
});
export type IssueListResponse = z.infer<typeof IssueListResponseSchema>;

export const UnifiedIssueListQuerySchema = IssueListQuerySchema.extend({
  instanceId: z.string().optional(),
});
export type UnifiedIssueListQuery = z.infer<typeof UnifiedIssueListQuerySchema>;

export const UnifiedIssueListResponseSchema = IssueListResponseSchema.extend({
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
export type UnifiedIssueListResponse = z.infer<typeof UnifiedIssueListResponseSchema>;

export const IssueCommentSchema = z.object({
  id: z.number().int(),
  message: z.string(),
  createdAt: z.string().optional(),
  user: RequestUserSchema.optional(),
});
export type IssueComment = z.infer<typeof IssueCommentSchema>;

export const IssueLibraryTargetSchema = z.object({
  instanceId: z.string(),
  instanceName: z.string(),
  externalId: z.number().int(),
  mediaType: z.enum(["movie", "tv"]),
});
export type IssueLibraryTarget = z.infer<typeof IssueLibraryTargetSchema>;

export const IssuePageDetailSchema = IssueListItemSchema.extend({
  overview: z.string().optional(),
  description: z.string().optional(),
  comments: z.array(IssueCommentSchema),
  libraryTargets: z.array(IssueLibraryTargetSchema),
});
export type IssuePageDetail = z.infer<typeof IssuePageDetailSchema>;

export const IssueAddCommentRequestSchema = z.object({
  message: z.string().trim().min(1),
});
export type IssueAddCommentRequest = z.infer<typeof IssueAddCommentRequestSchema>;
