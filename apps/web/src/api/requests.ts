import type {
  MediaRequestItem,
  MediaRequestListResponse,
  RequestEditDetail,
  RequestFilter,
  RequestMediaPageDetail,
  RequestMediaType,
  RequestSort,
  RequestSortDirection,
  RequestUpdateBody,
  RequestUser,
  SeerrServiceDetail,
  SeerrServiceServer,
  UnifiedMediaRequestListResponse,
} from "@umbrellarr/shared";
import { api } from "./client";

export type ListRequestsOptions = {
  take?: number;
  skip?: number;
  filter?: RequestFilter;
  mediaType?: "all" | RequestMediaType;
  sort?: RequestSort;
  sortDirection?: RequestSortDirection;
  requestedBy?: number;
};

export function listRequests(instanceId: string, options: ListRequestsOptions = {}) {
  const params = new URLSearchParams();
  if (options.take != null) params.set("take", String(options.take));
  if (options.skip != null) params.set("skip", String(options.skip));
  if (options.filter) params.set("filter", options.filter);
  if (options.mediaType) params.set("mediaType", options.mediaType);
  if (options.sort) params.set("sort", options.sort);
  if (options.sortDirection) params.set("sortDirection", options.sortDirection);
  if (options.requestedBy != null) params.set("requestedBy", String(options.requestedBy));
  const query = params.toString();
  return api<MediaRequestListResponse>(
    `/api/requests/${encodeURIComponent(instanceId)}${query ? `?${query}` : ""}`,
  );
}

export function listUnifiedRequests(
  options: ListRequestsOptions & { instanceId?: string } = {},
) {
  const params = new URLSearchParams();
  if (options.take != null) params.set("take", String(options.take));
  if (options.skip != null) params.set("skip", String(options.skip));
  if (options.filter) params.set("filter", options.filter);
  if (options.mediaType) params.set("mediaType", options.mediaType);
  if (options.sort) params.set("sort", options.sort);
  if (options.sortDirection) params.set("sortDirection", options.sortDirection);
  if (options.requestedBy != null) params.set("requestedBy", String(options.requestedBy));
  if (options.instanceId) params.set("instanceId", options.instanceId);
  const query = params.toString();
  return api<UnifiedMediaRequestListResponse>(
    `/api/requests/unified${query ? `?${query}` : ""}`,
  );
}

export function getRequestDetail(instanceId: string, requestId: number) {
  return api<RequestEditDetail>(
    `/api/requests/${encodeURIComponent(instanceId)}/${requestId}`,
  );
}

export function getRequestMediaPage(instanceId: string, requestId: number) {
  return api<RequestMediaPageDetail>(
    `/api/requests/${encodeURIComponent(instanceId)}/${requestId}/page`,
  );
}

export function approveRequest(instanceId: string, requestId: number) {
  return api<{ ok: true }>(
    `/api/requests/${encodeURIComponent(instanceId)}/${requestId}/approve`,
    { method: "POST" },
  );
}

export function declineRequest(instanceId: string, requestId: number) {
  return api<{ ok: true }>(
    `/api/requests/${encodeURIComponent(instanceId)}/${requestId}/decline`,
    { method: "POST" },
  );
}

export function updateRequest(
  instanceId: string,
  requestId: number,
  body: RequestUpdateBody,
) {
  return api<MediaRequestItem>(
    `/api/requests/${encodeURIComponent(instanceId)}/${requestId}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export function listRequestServices(instanceId: string, mediaType: RequestMediaType) {
  return api<{ servers: SeerrServiceServer[] }>(
    `/api/requests/${encodeURIComponent(instanceId)}/services/${mediaType}`,
  );
}

export function getRequestServiceDetail(
  instanceId: string,
  mediaType: RequestMediaType,
  serverId: number,
) {
  return api<SeerrServiceDetail>(
    `/api/requests/${encodeURIComponent(instanceId)}/services/${mediaType}/${serverId}`,
  );
}

export function listRequestUsers(instanceId: string) {
  return api<{ users: RequestUser[] }>(
    `/api/requests/${encodeURIComponent(instanceId)}/users`,
  );
}
