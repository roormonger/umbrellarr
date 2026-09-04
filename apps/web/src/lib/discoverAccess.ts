import type { InstanceKind } from "@umbrellarr/shared";

type Kinded = { kind: InstanceKind | string };

/** Discover browse needs Seerr; Movies/Shows (and add) need matching Arr. */
export function discoverAccess(instances: Kinded[]) {
  const hasSeerr = instances.some((i) => i.kind === "seerr");
  const hasRadarr = instances.some((i) => i.kind === "radarr");
  const hasSonarr = instances.some((i) => i.kind === "sonarr");
  return {
    hasSeerr,
    hasRadarr,
    hasSonarr,
    /** Nav + `/discover` — Seerr plus at least one Arr library app. */
    canShowDiscover: hasSeerr && (hasRadarr || hasSonarr),
    canShowMovies: hasSeerr && hasRadarr,
    canShowShows: hasSeerr && hasSonarr,
  };
}
