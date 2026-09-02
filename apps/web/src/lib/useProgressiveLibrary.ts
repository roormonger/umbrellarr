import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  LIBRARY_FULL_GC_MS,
  LIBRARY_FULL_STALE_MS,
  LIBRARY_HEAD_GC_MS,
  LIBRARY_HEAD_STALE_MS,
  pickLibraryListData,
} from "@/api/libraryList";

export function useProgressiveLibrary<T>(options: {
  instanceId?: string;
  fullQueryKey: readonly unknown[];
  headQueryKey: readonly unknown[];
  fetchHead: () => Promise<T>;
  fetchFull: () => Promise<T>;
  fetchRefresh: () => Promise<T>;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const { instanceId, fullQueryKey, headQueryKey, fetchHead, fetchFull, fetchRefresh, enabled = true } =
    options;

  const headQuery = useQuery({
    queryKey: headQueryKey,
    queryFn: fetchHead,
    staleTime: LIBRARY_HEAD_STALE_MS,
    gcTime: LIBRARY_HEAD_GC_MS,
    enabled,
  });

  const fullQuery = useQuery({
    queryKey: fullQueryKey,
    queryFn: fetchFull,
    staleTime: LIBRARY_FULL_STALE_MS,
    gcTime: LIBRARY_FULL_GC_MS,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: "always",
    enabled,
  });

  const { data, showingHead } = pickLibraryListData(fullQuery, headQuery);
  const showSkeleton = !data && (fullQuery.isPending || headQuery.isPending);
  const error = data ? null : (headQuery.error ?? fullQuery.error);
  const isFetching = fullQuery.isFetching || headQuery.isFetching;

  const refresh = useCallback(() => {
    return queryClient.fetchQuery({
      queryKey: fullQueryKey,
      queryFn: fetchRefresh,
      staleTime: 0,
    });
  }, [queryClient, fullQueryKey, fetchRefresh]);

  return {
    instanceId,
    data,
    showingHead,
    showSkeleton,
    error,
    isFetching,
    refresh,
  };
}
