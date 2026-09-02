import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { ensureAuthStatus, peekAuthStatus } from "@/api/auth";
import { listInstances } from "@/api/instances";
import { ensureArtistLibrary, ensureMovieLibrary, ensureShowLibrary } from "@/api/libraryList";
import { allLibrarySearch } from "@/lib/librarySearch";
import { AppLayout } from "@/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { MovieDetailPage } from "@/pages/MovieDetailPage";
import { MoviesPage } from "@/pages/MoviesPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { CollectionsPage } from "@/pages/CollectionsPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { QueuePage } from "@/pages/QueuePage";
import { RequestDetailPage } from "@/pages/RequestDetailPage";
import { RequestsPage } from "@/pages/RequestsPage";
import { IssuesPage } from "@/pages/IssuesPage";
import { IssueDetailPage } from "@/pages/IssueDetailPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ShowDetailPage } from "@/pages/ShowDetailPage";
import { ArtistDetailPage } from "@/pages/ArtistDetailPage";
import { ArtistsPage } from "@/pages/ArtistsPage";
import { ShowsPage } from "@/pages/ShowsPage";

export type RouterContext = {
  queryClient: QueryClient;
};

const INSTANCES_STALE_MS = 60_000;

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
  beforeLoad: async ({ context }) => {
    const status = await ensureAuthStatus(context.queryClient);
    if (status.authenticated) {
      throw redirect({ to: "/movies", search: allLibrarySearch });
    }
  },
});

/** Pathless auth layout — children own the real URLs. */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppLayout,
  beforeLoad: async ({ context }) => {
    const cached = peekAuthStatus(context.queryClient);
    if (cached) {
      if (!cached.authenticated) {
        throw redirect({ to: "/login" });
      }
      void ensureAuthStatus(context.queryClient);
      return;
    }
    const status = await ensureAuthStatus(context.queryClient);
    if (!status.authenticated) {
      throw redirect({ to: "/login" });
    }
  },
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/movies", search: allLibrarySearch });
  },
});

const moviesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/movies",
  validateSearch: (search: Record<string, unknown>) => ({
    instance: typeof search.instance === "string" ? search.instance : undefined,
  }),
  component: MoviesPage,
  beforeLoad: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["instances"],
      queryFn: listInstances,
      staleTime: INSTANCES_STALE_MS,
    });
    const hasRadarr = data.instances.some((instance) => instance.kind === "radarr");
    if (!hasRadarr) {
      throw redirect({ to: "/settings" });
    }
  },
  loader: ({ context }) => ensureMovieLibrary(context.queryClient),
});

const moviesInstanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/movies/$instanceId",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/movies",
      search: { instance: params.instanceId },
    });
  },
});

const moviesCollectionsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/movies/$instanceId/collections",
  component: CollectionsPage,
});

const moviesQueueRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/movies/$instanceId/queue",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/activity/queue",
      search: { instance: params.instanceId },
    });
  },
});

const moviesHistoryRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/movies/$instanceId/history",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/activity/history",
      search: { instance: params.instanceId },
    });
  },
});

const movieDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/movies/$instanceId/$movieId",
  component: MovieDetailPage,
});

const showsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/shows",
  validateSearch: (search: Record<string, unknown>) => ({
    instance: typeof search.instance === "string" ? search.instance : undefined,
  }),
  component: ShowsPage,
  beforeLoad: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["instances"],
      queryFn: listInstances,
      staleTime: INSTANCES_STALE_MS,
    });
    const hasSonarr = data.instances.some((instance) => instance.kind === "sonarr");
    if (!hasSonarr) {
      throw redirect({ to: "/settings" });
    }
  },
  loader: ({ context }) => ensureShowLibrary(context.queryClient),
});

const showsInstanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/shows/$instanceId",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/shows",
      search: { instance: params.instanceId },
    });
  },
});

const showsQueueRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/shows/$instanceId/queue",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/activity/queue",
      search: { instance: params.instanceId },
    });
  },
});

const showsHistoryRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/shows/$instanceId/history",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/activity/history",
      search: { instance: params.instanceId },
    });
  },
});

const showDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/shows/$instanceId/$seriesId",
  component: ShowDetailPage,
});

const musicRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/music",
  validateSearch: (search: Record<string, unknown>) => ({
    instance: typeof search.instance === "string" ? search.instance : undefined,
  }),
  component: ArtistsPage,
  beforeLoad: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["instances"],
      queryFn: listInstances,
      staleTime: INSTANCES_STALE_MS,
    });
    const hasLidarr = data.instances.some((instance) => instance.kind === "lidarr");
    if (!hasLidarr) {
      throw redirect({ to: "/settings" });
    }
  },
  loader: ({ context }) => ensureArtistLibrary(context.queryClient),
});

const musicInstanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/music/$instanceId",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/music",
      search: { instance: params.instanceId },
    });
  },
});

const musicQueueRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/music/$instanceId/queue",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/activity/queue",
      search: { instance: params.instanceId },
    });
  },
});

const musicHistoryRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/music/$instanceId/history",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/activity/history",
      search: { instance: params.instanceId },
    });
  },
});

const musicDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/music/$instanceId/$artistId",
  component: ArtistDetailPage,
});

/** Legacy paths → new routes */
const legacyMoviesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/library/movies",
  beforeLoad: () => {
    throw redirect({ to: "/movies", search: allLibrarySearch });
  },
});

const legacyMovieDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/library/movies/$instanceId/$movieId",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/movies/$instanceId/$movieId",
      params: {
        instanceId: params.instanceId,
        movieId: params.movieId,
      },
    });
  },
});

const legacyShowsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/library/shows",
  beforeLoad: () => {
    throw redirect({ to: "/shows", search: allLibrarySearch });
  },
});

const requestsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/requests",
  validateSearch: (search: Record<string, unknown>) => ({
    instance: typeof search.instance === "string" ? search.instance : undefined,
  }),
  component: RequestsPage,
  beforeLoad: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["instances"],
      queryFn: listInstances,
      staleTime: INSTANCES_STALE_MS,
    });
    const hasSeerr = data.instances.some((instance) => instance.kind === "seerr");
    if (!hasSeerr) {
      throw redirect({ to: "/settings" });
    }
  },
});

const requestsInstanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/requests/$instanceId",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/requests",
      search: { instance: params.instanceId },
    });
  },
});

const requestsIssuesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/requests/$instanceId/issues",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/issues",
      search: { instance: params.instanceId },
    });
  },
});

const issuesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/issues",
  validateSearch: (search: Record<string, unknown>) => ({
    instance: typeof search.instance === "string" ? search.instance : undefined,
  }),
  component: IssuesPage,
  beforeLoad: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["instances"],
      queryFn: listInstances,
      staleTime: INSTANCES_STALE_MS,
    });
    const hasSeerr = data.instances.some((instance) => instance.kind === "seerr");
    if (!hasSeerr) {
      throw redirect({ to: "/settings" });
    }
  },
});

const issueDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/issues/$instanceId/$issueId",
  component: IssueDetailPage,
});

const requestDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/requests/$instanceId/$requestId",
  component: RequestDetailPage,
});

const queueRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/activity/queue",
  validateSearch: (search: Record<string, unknown>) => ({
    instance: typeof search.instance === "string" ? search.instance : undefined,
  }),
  component: QueuePage,
});

const historyRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/activity/history",
  validateSearch: (search: Record<string, unknown>) => ({
    instance: typeof search.instance === "string" ? search.instance : undefined,
  }),
  component: HistoryPage,
});

const calendarRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/activity/calendar",
  component: CalendarPage,
});

const missingRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/activity/missing",
  component: () => (
    <PlaceholderPage title="Missing" description="Monitored titles that are not yet available." />
  ),
});

const statusRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/status",
  beforeLoad: () => {
    throw redirect({ to: "/settings" });
  },
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/settings",
  component: SettingsPage,
});

export const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    indexRoute,
    moviesRoute,
    moviesInstanceRoute,
    moviesCollectionsRoute,
    moviesQueueRoute,
    moviesHistoryRoute,
    movieDetailRoute,
    showsRoute,
    showsInstanceRoute,
    showsQueueRoute,
    showsHistoryRoute,
    showDetailRoute,
    musicRoute,
    musicInstanceRoute,
    musicQueueRoute,
    musicHistoryRoute,
    musicDetailRoute,
    legacyMoviesRoute,
    legacyMovieDetailRoute,
    legacyShowsRoute,
    requestsRoute,
    requestsInstanceRoute,
    requestsIssuesRoute,
    issuesRoute,
    issueDetailRoute,
    requestDetailRoute,
    queueRoute,
    historyRoute,
    calendarRoute,
    missingRoute,
    statusRoute,
    settingsRoute,
  ]),
]);
