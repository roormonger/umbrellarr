import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { getAuthStatus } from "@/api/auth";
import { AppLayout } from "@/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { StatusPage } from "@/pages/StatusPage";

export type RouterContext = {
  queryClient: QueryClient;
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
  beforeLoad: async () => {
    const status = await getAuthStatus();
    if (status.authenticated) {
      throw redirect({ to: "/library/movies" });
    }
  },
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppLayout,
  beforeLoad: async () => {
    const status = await getAuthStatus();
    if (!status.authenticated) {
      throw redirect({ to: "/login" });
    }
  },
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/library/movies" });
  },
});

const moviesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/library/movies",
  component: () => (
    <PlaceholderPage
      title="Movies"
      description="Your Radarr library will appear here as a poster grid."
    />
  ),
});

const showsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/library/shows",
  component: () => (
    <PlaceholderPage
      title="Shows"
      description="Your Sonarr library will appear here as a poster grid."
    />
  ),
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
  component: StatusPage,
});

export const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    indexRoute,
    moviesRoute,
    showsRoute,
    queueRoute,
    calendarRoute,
    missingRoute,
    statusRoute,
  ]),
]);
