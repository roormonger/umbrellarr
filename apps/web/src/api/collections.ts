import type {
  CollectionBulkUpdateRequest,
  CollectionEditOptions,
  CollectionListItem,
} from "@umbrellarr/shared";
import { api } from "./client";

export type CollectionsResponse = {
  collections: CollectionListItem[];
  count: number;
};

export function listCollections(instanceId: string) {
  const params = new URLSearchParams({ instanceId });
  return api<CollectionsResponse>(`/api/collections?${params}`);
}

export function getCollectionEditOptions(instanceId: string) {
  return api<CollectionEditOptions>(
    `/api/collections/${encodeURIComponent(instanceId)}/options`,
  );
}

export function refreshCollections(instanceId: string) {
  return api<{ ok: true }>(`/api/collections/${encodeURIComponent(instanceId)}/refresh`, {
    method: "POST",
  });
}

export function bulkUpdateCollections(instanceId: string, body: CollectionBulkUpdateRequest) {
  return api<{ ok: true }>(`/api/collections/${encodeURIComponent(instanceId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
