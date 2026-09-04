import { z } from "zod";

export const IndexerProtocolSchema = z.enum(["usenet", "torrent"]);
export type IndexerProtocol = z.infer<typeof IndexerProtocolSchema>;

export const IndexerPrivacySchema = z.enum(["public", "semiPrivate", "private"]);
export type IndexerPrivacy = z.infer<typeof IndexerPrivacySchema>;

export const IndexerStatusKindSchema = z.enum([
  "enabled",
  "enabledRedirected",
  "disabled",
  "error",
]);
export type IndexerStatusKind = z.infer<typeof IndexerStatusKindSchema>;

export const IndexerSortKeySchema = z.enum([
  "status",
  "name",
  "added",
  "syncProfile",
  "priority",
  "protocol",
  "privacy",
]);
export type IndexerSortKey = z.infer<typeof IndexerSortKeySchema>;

export const INDEXER_SORT_OPTIONS: Array<{ value: IndexerSortKey; label: string }> = [
  { value: "status", label: "Status" },
  { value: "name", label: "Name" },
  { value: "added", label: "Added" },
  { value: "syncProfile", label: "Sync Profile" },
  { value: "priority", label: "Priority" },
  { value: "protocol", label: "Protocol" },
  { value: "privacy", label: "Privacy" },
];

export const INDEXER_PROTOCOL_FILTER_OPTIONS: Array<{
  value: IndexerProtocol | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "usenet", label: "Usenet" },
  { value: "torrent", label: "Torrent" },
];

export const INDEXER_PRIVACY_FILTER_OPTIONS: Array<{
  value: IndexerPrivacy | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "semiPrivate", label: "Semi-private" },
  { value: "private", label: "Private" },
];

export const INDEXER_ENABLED_FILTER_OPTIONS: Array<{
  value: "all" | "enabled" | "disabled";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

export const IndexerListItemSchema = z.object({
  id: z.number().int(),
  instanceId: z.string(),
  instanceName: z.string(),
  name: z.string(),
  enable: z.boolean(),
  redirect: z.boolean(),
  statusKind: IndexerStatusKindSchema,
  protocol: IndexerProtocolSchema,
  privacy: IndexerPrivacySchema,
  priority: z.number().int(),
  appProfileId: z.number().int(),
  syncProfile: z.string(),
  added: z.string().optional(),
  categories: z.array(z.string()).default([]),
  websiteUrl: z.string().optional(),
});
export type IndexerListItem = z.infer<typeof IndexerListItemSchema>;

export const UnifiedIndexerErrorSchema = z.object({
  instanceId: z.string(),
  instanceName: z.string(),
  message: z.string(),
});
export type UnifiedIndexerError = z.infer<typeof UnifiedIndexerErrorSchema>;

export const UnifiedIndexerResponseSchema = z.object({
  items: z.array(IndexerListItemSchema),
  errors: z.array(UnifiedIndexerErrorSchema).default([]),
});
export type UnifiedIndexerResponse = z.infer<typeof UnifiedIndexerResponseSchema>;

export const INDEXER_SECRET_SENTINEL = "********";

export const IndexerFieldPrivacySchema = z.enum(["normal", "password", "apiKey", "userName"]);
export type IndexerFieldPrivacy = z.infer<typeof IndexerFieldPrivacySchema>;

export const IndexerSelectOptionSchema = z.object({
  value: z.union([z.string(), z.number()]),
  name: z.string(),
  order: z.number().optional(),
  hint: z.string().optional(),
});
export type IndexerSelectOption = z.infer<typeof IndexerSelectOptionSchema>;

export const IndexerFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  helpText: z.string().optional(),
  helpTextWarning: z.string().optional(),
  helpLink: z.string().optional(),
  value: z.unknown().optional(),
  type: z.string(),
  advanced: z.boolean().default(false),
  hidden: z.string().optional(),
  privacy: IndexerFieldPrivacySchema.optional(),
  placeholder: z.string().optional(),
  selectOptions: z.array(IndexerSelectOptionSchema).optional(),
  selectOptionsProviderAction: z.string().optional(),
  isFloat: z.boolean().optional(),
  section: z.string().optional(),
});
export type IndexerField = z.infer<typeof IndexerFieldSchema>;

export const IndexerFieldValueSchema = z.object({
  name: z.string(),
  value: z.unknown(),
});
export type IndexerFieldValue = z.infer<typeof IndexerFieldValueSchema>;

export const IndexerEditDetailSchema = z.object({
  id: z.number().int(),
  instanceId: z.string(),
  name: z.string(),
  enable: z.boolean(),
  redirect: z.boolean(),
  appProfileId: z.number().int(),
  priority: z.number().int(),
  downloadClientId: z.number().int(),
  tags: z.array(z.number().int()).default([]),
  protocol: IndexerProtocolSchema,
  implementationName: z.string(),
  supportsRedirect: z.boolean(),
  supportsRss: z.boolean(),
  fields: z.array(IndexerFieldSchema),
});
export type IndexerEditDetail = z.infer<typeof IndexerEditDetailSchema>;

export const IndexerEditOptionsSchema = z.object({
  appProfiles: z.array(z.object({ id: z.number().int(), name: z.string() })),
  tags: z.array(z.object({ id: z.number().int(), label: z.string() })),
  downloadClients: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      protocol: z.string().optional(),
    }),
  ),
});
export type IndexerEditOptions = z.infer<typeof IndexerEditOptionsSchema>;

export const IndexerUpdateRequestSchema = z.object({
  name: z.string(),
  enable: z.boolean(),
  redirect: z.boolean(),
  appProfileId: z.number().int(),
  priority: z.number().int(),
  downloadClientId: z.number().int(),
  tags: z.array(z.number().int()),
  fields: z.array(IndexerFieldValueSchema),
});
export type IndexerUpdateRequest = z.infer<typeof IndexerUpdateRequestSchema>;

export const IndexerSchemaItemSchema = z.object({
  key: z.string(),
  name: z.string(),
  implementation: z.string(),
  implementationName: z.string(),
  definitionName: z.string(),
  protocol: IndexerProtocolSchema,
  privacy: IndexerPrivacySchema,
  language: z.string(),
  description: z.string(),
  categoryIds: z.array(z.number().int()).default([]),
  categories: z.array(z.string()).default([]),
});
export type IndexerSchemaItem = z.infer<typeof IndexerSchemaItemSchema>;

export const IndexerSchemaListResponseSchema = z.object({
  items: z.array(IndexerSchemaItemSchema),
});
export type IndexerSchemaListResponse = z.infer<typeof IndexerSchemaListResponseSchema>;

export const IndexerSchemaCategorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  subCategories: z
    .array(z.object({ id: z.number().int(), name: z.string() }))
    .default([]),
});
export type IndexerSchemaCategory = z.infer<typeof IndexerSchemaCategorySchema>;

export const IndexerSchemaCategoriesResponseSchema = z.object({
  categories: z.array(IndexerSchemaCategorySchema),
});
export type IndexerSchemaCategoriesResponse = z.infer<typeof IndexerSchemaCategoriesResponseSchema>;

export const IndexerSchemaTemplateSchema = z.object({
  key: z.string(),
  name: z.string(),
  enable: z.boolean(),
  redirect: z.boolean(),
  appProfileId: z.number().int(),
  priority: z.number().int(),
  downloadClientId: z.number().int(),
  tags: z.array(z.number().int()).default([]),
  protocol: IndexerProtocolSchema,
  privacy: IndexerPrivacySchema,
  implementation: z.string(),
  implementationName: z.string(),
  definitionName: z.string(),
  configContract: z.string(),
  supportsRedirect: z.boolean(),
  supportsRss: z.boolean(),
  fields: z.array(IndexerFieldSchema),
});
export type IndexerSchemaTemplate = z.infer<typeof IndexerSchemaTemplateSchema>;

export const IndexerCreateRequestSchema = IndexerUpdateRequestSchema.extend({
  implementation: z.string(),
  implementationName: z.string(),
  configContract: z.string(),
  definitionName: z.string(),
});
export type IndexerCreateRequest = z.infer<typeof IndexerCreateRequestSchema>;
