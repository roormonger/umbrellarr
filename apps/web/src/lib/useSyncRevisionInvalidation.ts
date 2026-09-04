import type { SyncRevision } from "@umbrellarr/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getSyncRevision } from "@/api/sync";
import { focusAwareRefetchInterval } from "@/lib/queryFocus";

const SYNC_POLL_MS = 4_000;

/**
 * Polls cheap BFF revision counters and invalidates React Query only when
 * a counter increases (SignalR-driven sync on the server for Arr/Prowlarr;
 * Seerr request/issue bumps come from BFF mutations).
 */
export function useSyncRevisionInvalidation(enabled = true) {
  const queryClient = useQueryClient();
  const previous = useRef<SyncRevision | null>(null);

  const query = useQuery({
    queryKey: ["sync", "revision"],
    queryFn: getSyncRevision,
    enabled,
    staleTime: 0,
    refetchInterval: focusAwareRefetchInterval(SYNC_POLL_MS),
  });

  useEffect(() => {
    const next = query.data;
    if (!next) return;
    const prev = previous.current;
    previous.current = next;
    if (!prev) return;

    if (next.library > prev.library) {
      void queryClient.invalidateQueries({ queryKey: ["movies"] });
      void queryClient.invalidateQueries({ queryKey: ["shows"] });
      void queryClient.invalidateQueries({ queryKey: ["artists"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    }
    if (next.queue > prev.queue) {
      void queryClient.invalidateQueries({ queryKey: ["queue"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    }
    if (next.history > prev.history) {
      void queryClient.invalidateQueries({ queryKey: ["history"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    }
    if (next.requests > prev.requests) {
      void queryClient.invalidateQueries({ queryKey: ["requests"] });
      // Seerr has no SignalR; request mutations also refresh Discover badges/links.
      void queryClient.invalidateQueries({ queryKey: ["discover"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    }
    if (next.issues > prev.issues) {
      void queryClient.invalidateQueries({ queryKey: ["issues"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    }
    if (next.wanted > prev.wanted) {
      void queryClient.invalidateQueries({ queryKey: ["wanted"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    }
    if (next.indexers > prev.indexers) {
      void queryClient.invalidateQueries({ queryKey: ["indexers"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    }
  }, [query.data, queryClient]);
}
