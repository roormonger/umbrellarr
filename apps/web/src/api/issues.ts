import type { IssueFilter, IssueSort, RequestSortDirection, UnifiedIssueListResponse } from "@umbrellarr/shared";
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
