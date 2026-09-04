import type {
  WantedMode,
  WantedMonitorRequest,
  WantedSearchRequest,
  WantedUnmonitorRequest,
  UnifiedWantedResponse,
} from "@umbrellarr/shared";
import { api } from "./client";

export type UnifiedWantedParams = {
  mode?: WantedMode;
  page?: number;
  pageSize?: number;
  instanceId?: string;
  monitored?: boolean;
};

export function listUnifiedWanted(params: UnifiedWantedParams = {}) {
  const search = new URLSearchParams();
  search.set("mode", params.mode ?? "missing");
  if (params.page != null) search.set("page", String(params.page));
  if (params.pageSize != null) search.set("pageSize", String(params.pageSize));
  if (params.instanceId) search.set("instanceId", params.instanceId);
  if (params.monitored === false) search.set("monitored", "false");
  return api<UnifiedWantedResponse>(`/api/wanted/unified?${search}`);
}

export function searchWantedInstance(instanceId: string, body: WantedSearchRequest) {
  return api<{ ok: true }>(`/api/wanted/${encodeURIComponent(instanceId)}/search`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function searchWantedAll(body: { mode: WantedMode; instanceId?: string }) {
  return api<{
    ok: true;
    errors: Array<{ instanceId: string; instanceName: string; message: string }>;
  }>("/api/wanted/search-all", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function unmonitorWanted(body: WantedUnmonitorRequest) {
  return api<{ ok: true }>("/api/wanted/unmonitor", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function monitorWanted(body: WantedMonitorRequest) {
  return api<{ ok: true }>("/api/wanted/monitor", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
