import type { Availability } from "@umbrellarr/shared";

/** Arr dark-theme poster bar colors (Movie/Series/Artist IndexFooter.css). */
export const POSTER_STATUS_COLORS: Record<Availability, string> = {
  downloaded: "#00853d",
  ended: "#00853d",
  downloadedUnmonitored: "#888",
  missingMonitored: "#f05050",
  missingUnmonitored: "#ffa500",
  queued: "#7a43b6",
  downloading: "#7a43b6",
  unreleased: "#5d9cec",
  continuing: "#5d9cec",
};

export function hasMixedAvailability(
  copies: ReadonlyArray<{ availability: Availability }>,
): boolean {
  if (copies.length < 2) return false;
  const first = copies[0]!.availability;
  return copies.some((copy) => copy.availability !== first);
}
