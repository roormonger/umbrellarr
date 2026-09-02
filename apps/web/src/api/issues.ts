import type {
  IssueFilter,
  IssuePageDetail,
  IssueSort,
  RequestSortDirection,
  UnifiedIssueListResponse,
} from "@umbrellarr/shared";
import { api } from "./client";

export type ListIssuesOptions = {
  take?: number;
  skip?: number;
  filter?: IssueFilter;
  sort?: IssueSort;
  sortDirection?: RequestSortDirection;
  instanceId?: string;
};

export function listUnifiedIssues(options: ListIssuesOptions = {}) {
  const params = new URLSearchParams();
  if (options.take != null) params.set("take", String(options.take));
  if (options.skip != null) params.set("skip", String(options.skip));
  if (options.filter) params.set("filter", options.filter);
  if (options.sort) params.set("sort", options.sort);
  if (options.sortDirection) params.set("sortDirection", options.sortDirection);
  if (options.instanceId) params.set("instanceId", options.instanceId);
  const query = params.toString();
  return api<UnifiedIssueListResponse>(`/api/issues/unified${query ? `?${query}` : ""}`);
}

export function getIssueDetail(instanceId: string, issueId: number) {
  return api<IssuePageDetail>(`/api/issues/${encodeURIComponent(instanceId)}/${issueId}`);
}

export function addIssueComment(instanceId: string, issueId: number, message: string) {
  return api<IssuePageDetail>(`/api/issues/${encodeURIComponent(instanceId)}/${issueId}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

export function resolveIssue(instanceId: string, issueId: number) {
  return api<IssuePageDetail>(`/api/issues/${encodeURIComponent(instanceId)}/${issueId}/resolve`, {
    method: "POST",
  });
}
