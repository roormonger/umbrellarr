import type {
  QueueGrabRequest,
  QueueListResponse,
  QueueManualImportItem,
  QueueManualImportUpdateRequest,
  QueueProtocol,
  QueueRemoveRequest,
  QueueStatus,
  QueueStatusFilter,
  UnifiedQueueResponse,
} from "@umbrellarr/shared";
import { api } from "./client";

export type QueueListParams = {
  page?: number;
  pageSize?: number;
  includeUnknown?: boolean;
  protocol?: QueueProtocol | "all";
  status?: QueueStatusFilter;
};

export type UnifiedQueueListParams = QueueListParams & {
  instanceId?: string;
};

export function listUnifiedQueue(params: UnifiedQueueListParams = {}) {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.pageSize != null) search.set("pageSize", String(params.pageSize));
  if (params.includeUnknown === false) search.set("includeUnknown", "false");
  if (params.protocol && params.protocol !== "all") search.set("protocol", params.protocol);
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.instanceId) search.set("instanceId", params.instanceId);
  return api<UnifiedQueueResponse>(`/api/queue/unified?${search}`);
}

export function listQueue(instanceId: string, params: QueueListParams = {}) {
  const search = new URLSearchParams({ instanceId });
  if (params.page != null) search.set("page", String(params.page));
  if (params.pageSize != null) search.set("pageSize", String(params.pageSize));
  if (params.includeUnknown === false) search.set("includeUnknown", "false");
  if (params.protocol && params.protocol !== "all") search.set("protocol", params.protocol);
  if (params.status && params.status !== "all") search.set("status", params.status);
  return api<QueueListResponse>(`/api/queue?${search}`);
}

export function getQueueStatus(instanceId: string) {
  return api<QueueStatus>(`/api/queue/${encodeURIComponent(instanceId)}/status`);
}

export function refreshQueue(instanceId: string) {
  return api<{ ok: true }>(`/api/queue/${encodeURIComponent(instanceId)}/refresh`, {
    method: "POST",
  });
}

export function removeQueueItems(instanceId: string, body: QueueRemoveRequest) {
  const path =
    body.ids.length === 1
      ? `/api/queue/${encodeURIComponent(instanceId)}/${body.ids[0]}`
      : `/api/queue/${encodeURIComponent(instanceId)}/bulk`;
  return api<{ ok: true }>(path, {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

export function grabQueueItems(instanceId: string, body: QueueGrabRequest) {
  const path =
    body.ids.length === 1
      ? `/api/queue/${encodeURIComponent(instanceId)}/${body.ids[0]}/grab`
      : `/api/queue/${encodeURIComponent(instanceId)}/grab/bulk`;
  return api<{ ok: true }>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getManualImport(
  instanceId: string,
  options: { downloadId?: string; folder?: string },
) {
  const search = new URLSearchParams();
  if (options.downloadId) search.set("downloadId", options.downloadId);
  if (options.folder) search.set("folder", options.folder);
  return api<{ files: QueueManualImportItem[] }>(
    `/api/queue/${encodeURIComponent(instanceId)}/manualimport?${search}`,
  );
}

export function postManualImport(instanceId: string, body: QueueManualImportUpdateRequest) {
  return api<{ ok: true }>(`/api/queue/${encodeURIComponent(instanceId)}/manualimport`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
