import type { QueryClient } from "@tanstack/react-query";
import { listUnifiedHistory } from "@/api/history";
import { listUnifiedIssues } from "@/api/issues";
import { listUnifiedQueue } from "@/api/queue";
import { listUnifiedRequests } from "@/api/requests";
import { ACTIVITY_LIST_STALE_MS } from "@/lib/queryFocus";

export function prefetchQueue(queryClient: QueryClient) {
  void queryClient.prefetchQuery({
    queryKey: ["queue", "unified", undefined, true, "all", "all"],
    queryFn: () =>
      listUnifiedQueue({
        page: 1,
        pageSize: 200,
        includeUnknown: true,
        protocol: "all",
        status: "all",
      }),
    staleTime: ACTIVITY_LIST_STALE_MS,
  });
}

export function prefetchHistory(queryClient: QueryClient) {
  void queryClient.prefetchQuery({
    queryKey: ["history", "unified", 1, undefined, "all", "all"],
    queryFn: () =>
      listUnifiedHistory({
        page: 1,
        pageSize: 50,
        eventType: "all",
        protocol: "all",
      }),
    staleTime: ACTIVITY_LIST_STALE_MS,
  });
}

export function prefetchRequests(queryClient: QueryClient) {
  void queryClient.prefetchQuery({
    queryKey: ["requests", "unified", undefined, "all", "pending", "added", "desc", "all", 0],
    queryFn: () =>
      listUnifiedRequests({
        take: 25,
        skip: 0,
        mediaType: "all",
        filter: "pending",
        sort: "added",
        sortDirection: "desc",
      }),
    staleTime: ACTIVITY_LIST_STALE_MS,
  });
}

export function prefetchIssues(queryClient: QueryClient) {
  void queryClient.prefetchQuery({
    queryKey: ["issues", "unified", undefined, "open", "added", "desc", 0],
    queryFn: () =>
      listUnifiedIssues({
        take: 25,
        skip: 0,
        filter: "open",
        sort: "added",
        sortDirection: "desc",
      }),
    staleTime: ACTIVITY_LIST_STALE_MS,
  });
}
