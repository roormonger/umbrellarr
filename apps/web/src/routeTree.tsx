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
import { AppLayout } from "@/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { MovieDetailPage } from "@/pages/MovieDetailPage";
import { MoviesPage } from "@/pages/MoviesPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { RequestDetailPage } from "@/pages/RequestDetailPage";
import { RequestsPage } from "@/pages/RequestsPage";
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
      throw redirect({ to: "/movies" });
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
    throw redirect({ to: "/movies" });
  },
});

const moviesIndexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/movies",
  beforeLoad: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["instances"],
      queryFn: listInstances,
      staleTime: INSTANCES_STALE_MS,
    });
    const first = data.instances.find((i) => i.kind === "radarr");
    if (!first) {
      throw redirect({ to: "/settings" });
    }
    throw redirect({
      to: "/movies/$instanceId",
      params: { instanceId: first.id },
    });
  },
});

const moviesInstanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/movies/$instanceId",
  component: MoviesPage,
  loader: ({ context, params }) => ensureMovieLibrary(context.queryClient, params.instanceId),
});

const movieDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/movies/$instanceId/$movieId",
  component: MovieDetailPage,
});

const showsIndexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/shows",
  beforeLoad: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["instances"],
      queryFn: listInstances,
      staleTime: INSTANCES_STALE_MS,
    });
    const first = data.instances.find((i) => i.kind === "sonarr");
    if (!first) {
      throw redirect({ to: "/settings" });
    }
    throw redirect({
      to: "/shows/$instanceId",
      params: { instanceId: first.id },
    });
  },
});

const showsInstanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/shows/$instanceId",
  component: ShowsPage,
  loader: ({ context, params }) => ensureShowLibrary(context.queryClient, params.instanceId),
});

const showDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/shows/$instanceId/$seriesId",
  component: ShowDetailPage,
});

const musicIndexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/music",
  beforeLoad: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["instances"],
      queryFn: listInstances,
      staleTime: INSTANCES_STALE_MS,
    });
    const first = data.instances.find((i) => i.kind === "lidarr");
    if (!first) {
      throw redirect({ to: "/settings" });
    }
    throw redirect({
      to: "/music/$instanceId",
      params: { instanceId: first.id },
    });
  },
});

const musicInstanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/music/$instanceId",
  component: ArtistsPage,
  loader: ({ context, params }) => ensureArtistLibrary(context.queryClient, params.instanceId),
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
    throw redirect({ to: "/movies" });
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
    throw redirect({ to: "/shows" });
  },
});

const requestsIndexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/requests",
  beforeLoad: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["instances"],
      queryFn: listInstances,
      staleTime: INSTANCES_STALE_MS,
    });
    const first = data.instances.find((i) => i.kind === "seerr");
    if (!first) {
      throw redirect({ to: "/settings" });
    }
    throw redirect({
      to: "/requests/$instanceId",
      params: { instanceId: first.id },
    });
  },
});

const requestsInstanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/requests/$instanceId",
  component: RequestsPage,
});

const requestDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/requests/$instanceId/$requestId",
  component: RequestDetailPage,
});

const queueRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/activity/queue",
  component: () => (
    <PlaceholderPage title="Queue" description="Download queue across Radarr and Sonarr." />
  ),
});

const calendarRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/activity/calendar",
  component: () => (
    <PlaceholderPage title="Calendar" description="Upcoming movies and episodes." />
  ),
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
    moviesIndexRoute,
    moviesInstanceRoute,
    movieDetailRoute,
    showsIndexRoute,
    showsInstanceRoute,
    showDetailRoute,
    musicIndexRoute,
    musicInstanceRoute,
    musicDetailRoute,
    legacyMoviesRoute,
    legacyMovieDetailRoute,
    legacyShowsRoute,
    requestsIndexRoute,
    requestsInstanceRoute,
    requestDetailRoute,
    queueRoute,
    calendarRoute,
    missingRoute,
    statusRoute,
    settingsRoute,
  ]),
]);
