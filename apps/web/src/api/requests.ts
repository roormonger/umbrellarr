import type {
  MediaRequestItem,
  MediaRequestListResponse,
  RequestEditDetail,
  RequestFilter,
  RequestMediaType,
  RequestSort,
  RequestSortDirection,
  RequestUpdateBody,
  RequestUser,
  SeerrServiceDetail,
  SeerrServiceServer,
} from "@umbrellarr/shared";
import { api } from "./client";

export type ListRequestsOptions = {
  take?: number;
  skip?: number;
  filter?: RequestFilter;
  mediaType?: "all" | RequestMediaType;
  sort?: RequestSort;
  sortDirection?: RequestSortDirection;
};

export function listRequests(instanceId: string, options: ListRequestsOptions = {}) {
  const params = new URLSearchParams();
  if (options.take != null) params.set("take", String(options.take));
  if (options.skip != null) params.set("skip", String(options.skip));
  if (options.filter) params.set("filter", options.filter);
  if (options.mediaType) params.set("mediaType", options.mediaType);
  if (options.sort) params.set("sort", options.sort);
  if (options.sortDirection) params.set("sortDirection", options.sortDirection);
  const query = params.toString();
  return api<MediaRequestListResponse>(
    `/api/requests/${encodeURIComponent(instanceId)}${query ? `?${query}` : ""}`,
  );
}

export function getRequestDetail(instanceId: string, requestId: number) {
  return api<RequestEditDetail>(
    `/api/requests/${encodeURIComponent(instanceId)}/${requestId}`,
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
