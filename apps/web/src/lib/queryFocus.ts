/** Poll only while the document is focused/visible; otherwise return false. */
export function focusAwareRefetchInterval(ms: number) {
  return () => {
    if (typeof document === "undefined") return false;
    if (document.visibilityState !== "visible") return false;
    if (typeof document.hasFocus === "function" && !document.hasFocus()) return false;
    return ms;
  };
}

export const ACTIVITY_LIST_STALE_MS = 90_000;
export const ACTIVITY_POLL_MS = 12_000;
export const SEERR_LIST_POLL_MS = 20_000;
