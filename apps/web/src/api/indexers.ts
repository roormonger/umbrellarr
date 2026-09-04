import type {
  IndexerCreateRequest,
  IndexerEditDetail,
  IndexerEditOptions,
  IndexerSchemaCategoriesResponse,
  IndexerSchemaListResponse,
  IndexerSchemaTemplate,
  IndexerUpdateRequest,
  UnifiedIndexerResponse,
} from "@umbrellarr/shared";
import { api } from "./client";

export function listUnifiedIndexers(instanceId?: string) {
  const search = new URLSearchParams();
  if (instanceId) search.set("instanceId", instanceId);
  const suffix = instanceId ? `?${search}` : "";
  return api<UnifiedIndexerResponse>(`/api/indexers/unified${suffix}`);
}

export function indexerRssHref(instanceId: string, indexerId: number): string {
  return `/api/indexers/${encodeURIComponent(instanceId)}/${indexerId}/rss`;
}

export function getIndexerEditDetail(instanceId: string, indexerId: number) {
  return api<IndexerEditDetail>(
    `/api/indexers/${encodeURIComponent(instanceId)}/${indexerId}`,
  );
}

export function getIndexerEditOptions(instanceId: string) {
  return api<IndexerEditOptions>(`/api/indexers/${encodeURIComponent(instanceId)}/options`);
}

export function listIndexerSchema(instanceId: string) {
  return api<IndexerSchemaListResponse>(
    `/api/indexers/${encodeURIComponent(instanceId)}/schema`,
  );
}

export function getIndexerSchemaTemplate(instanceId: string, key: string) {
  const search = new URLSearchParams({ key });
  return api<IndexerSchemaTemplate>(
    `/api/indexers/${encodeURIComponent(instanceId)}/schema/template?${search}`,
  );
}

export function listIndexerCategories(instanceId: string) {
  return api<IndexerSchemaCategoriesResponse>(
    `/api/indexers/${encodeURIComponent(instanceId)}/categories`,
  );
}

export function updateIndexer(
  instanceId: string,
  indexerId: number,
  body: IndexerUpdateRequest,
  forceSave = false,
) {
  const suffix = forceSave ? "?forceSave=true" : "";
  return api<{ ok: true }>(
    `/api/indexers/${encodeURIComponent(instanceId)}/${indexerId}${suffix}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export function createIndexer(instanceId: string, body: IndexerCreateRequest, forceSave = false) {
  const suffix = forceSave ? "?forceSave=true" : "";
  return api<{ ok: true }>(`/api/indexers/${encodeURIComponent(instanceId)}${suffix}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function testIndexer(
  instanceId: string,
  indexerId: number,
  body: IndexerUpdateRequest,
  forceTest = false,
) {
  const suffix = forceTest ? "?forceTest=true" : "";
  return api<{ ok: true }>(
    `/api/indexers/${encodeURIComponent(instanceId)}/${indexerId}/test${suffix}`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function testIndexerCreate(
  instanceId: string,
  body: IndexerCreateRequest,
  forceTest = false,
) {
  const suffix = forceTest ? "?forceTest=true" : "";
  return api<{ ok: true }>(
    `/api/indexers/${encodeURIComponent(instanceId)}/test${suffix}`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function deleteIndexer(instanceId: string, indexerId: number) {
  return api<{ ok: true }>(`/api/indexers/${encodeURIComponent(instanceId)}/${indexerId}`, {
    method: "DELETE",
  });
}
