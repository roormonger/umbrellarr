import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InstancePublic } from "@umbrellarr/shared";
import { listInstances } from "@/api/instances";
import { DiscoverLibraryAddModal } from "@/components/discover/DiscoverLibraryAddModal";

export type DiscoverOpenAddArgs = {
  mediaType: "movie" | "tv";
  tmdbId: number;
  titleHint?: string;
  /** When set, locks the add modal to this Arr instance. */
  instanceId?: string;
};

type DiscoverAddContextValue = {
  openAdd: (args: DiscoverOpenAddArgs) => void;
  isAdding: boolean;
  radarrInstances: InstancePublic[];
  sonarrInstances: InstancePublic[];
};

const DiscoverAddContext = createContext<DiscoverAddContextValue | null>(null);

export function DiscoverAddProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<DiscoverOpenAddArgs | null>(null);

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  const radarrInstances = useMemo(
    () => (instancesQuery.data?.instances ?? []).filter((i) => i.kind === "radarr"),
    [instancesQuery.data?.instances],
  );
  const sonarrInstances = useMemo(
    () => (instancesQuery.data?.instances ?? []).filter((i) => i.kind === "sonarr"),
    [instancesQuery.data?.instances],
  );

  const openAdd = useCallback((args: DiscoverOpenAddArgs) => {
    setPending(args);
  }, []);

  const value = useMemo(
    () => ({
      openAdd,
      isAdding: pending != null,
      radarrInstances,
      sonarrInstances,
    }),
    [openAdd, pending, radarrInstances, sonarrInstances],
  );

  return (
    <DiscoverAddContext.Provider value={value}>
      {children}
      {pending ? (
        <DiscoverLibraryAddModal
          opened
          mediaType={pending.mediaType}
          tmdbId={pending.tmdbId}
          titleHint={pending.titleHint}
          initialInstanceId={pending.instanceId}
          onClose={() => setPending(null)}
        />
      ) : null}
    </DiscoverAddContext.Provider>
  );
}

export function useDiscoverAdd() {
  const ctx = useContext(DiscoverAddContext);
  if (!ctx) {
    throw new Error("useDiscoverAdd must be used within DiscoverAddProvider");
  }
  return ctx;
}
