import {
  createContext,
  useContext,
  useLayoutEffect,
  type Dispatch,
  type SetStateAction,
} from "react";

export type PageHeaderInfo = {
  title?: string;
  /** Shown next to the title, e.g. "3,876" or "12 of 3,876". */
  count?: string | null;
  /** When set, show a back arrow in the top bar that navigates here. */
  backTo?: string | null;
};

export const PageHeaderContext = createContext<Dispatch<
  SetStateAction<PageHeaderInfo>
> | null>(null);

/** Publish the current page title (and optional count / back target) into the app header. */
export function usePageHeader(
  title: string,
  count?: string | null,
  backTo?: string | null,
) {
  const setPageHeader = useContext(PageHeaderContext);

  useLayoutEffect(() => {
    setPageHeader?.({ title, count: count ?? null, backTo: backTo ?? null });
    return () => setPageHeader?.({});
  }, [title, count, backTo, setPageHeader]);
}

export function titleFromPath(pathname: string): string {
  if (/\/collections\/?$/.test(pathname)) return "Collections";
  if (/\/queue\/?$/.test(pathname)) return "Queue";
  if (/\/history\/?$/.test(pathname)) return "History";
  if (pathname.startsWith("/issues/") && pathname.split("/").length > 3) return "Issue";
  if (/\/issues\/?$/.test(pathname)) return "Issues";
  if (/^\/movies\/[^/]+\/[^/]+/.test(pathname)) return "Movie";
  if (pathname.startsWith("/movies")) return "Movies";
  if (/^\/shows\/[^/]+\/[^/]+/.test(pathname)) return "Show";
  if (pathname.startsWith("/shows")) return "Shows";
  if (/^\/music\/[^/]+\/[^/]+/.test(pathname)) return "Artist";
  if (pathname.startsWith("/music")) return "Music";
  if (pathname.startsWith("/requests")) return "Requests";
  if (pathname.startsWith("/activity/calendar")) return "Calendar";
  if (pathname.startsWith("/activity/missing")) return "Missing";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Umbrellarr";
}
