import type {
  HistoryEventType,
  HistoryProtocolFilter,
  UnifiedHistoryResponse,
} from "@umbrellarr/shared";
import { api } from "./client";

export type UnifiedHistoryParams = {
  page?: number;
  pageSize?: number;
  instanceId?: string;
  eventType?: HistoryEventType | "all";
  protocol?: HistoryProtocolFilter | "all";
};

export function listUnifiedHistory(params: UnifiedHistoryParams = {}) {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.pageSize != null) search.set("pageSize", String(params.pageSize));
  if (params.instanceId) search.set("instanceId", params.instanceId);
  if (params.eventType && params.eventType !== "all") search.set("eventType", params.eventType);
  if (params.protocol && params.protocol !== "all") search.set("protocol", params.protocol);
  return api<UnifiedHistoryResponse>(`/api/history/unified?${search}`);
}

export function deleteHistoryItem(instanceId: string, historyId: number) {
  return api<{ ok: true }>(`/api/history/${encodeURIComponent(instanceId)}/${historyId}`, {
    method: "DELETE",
  });
}
