import {
  ActionIcon,
  AppShell,
  Badge,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  Title,
  UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { FilmStripIcon } from "@phosphor-icons/react/dist/csr/FilmStrip";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { MusicNotesIcon } from "@phosphor-icons/react/dist/csr/MusicNotes";
import { SignOutIcon } from "@phosphor-icons/react/dist/csr/SignOut";
import { TelevisionIcon } from "@phosphor-icons/react/dist/csr/Television";
import { TicketIcon } from "@phosphor-icons/react/dist/csr/Ticket";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { clearAuthStatusCache, logout } from "@/api/auth";
import { listInstances } from "@/api/instances";
import {
  prefetchArtistHead,
  prefetchArtistLibrary,
  prefetchMovieHead,
  prefetchMovieLibrary,
  prefetchShowHead,
  prefetchShowLibrary,
} from "@/api/libraryList";
import {
  prefetchHistory,
  prefetchIssues,
  prefetchQueue,
  prefetchRequests,
} from "@/api/activityPrefetch";
import { getDashboardStats } from "@/api/stats";
import umbrellarrIcon from "@/assets/umbrellarr-icon.png";
import { PageHeaderContext, titleFromPath, type PageHeaderInfo } from "@/layout/pageHeader";
import { setLastInstanceId } from "@/lib/lastInstance";
import { allLibrarySearch } from "@/lib/librarySearch";
import { allIssuesSearch } from "@/lib/issuesSearch";
import { focusAwareRefetchInterval } from "@/lib/queryFocus";
import { useSyncRevisionInvalidation } from "@/lib/useSyncRevisionInvalidation";
import classes from "./AppLayout.module.css";

const RESERVED_SEGMENTS = new Set(["collections", "queue", "history", "issues"]);

function instanceFromSearch(pathname: string, prefix: string, search: string): string | undefined {
  if (pathname !== prefix) return undefined;
  const id = new URLSearchParams(search).get("instance");
  return id && id.length > 0 ? id : undefined;
}

function instanceIdFromPath(pathname: string, prefix: string): string | undefined {
  if (!pathname.startsWith(`${prefix}/`)) return undefined;
  const id = pathname.slice(prefix.length + 1).split("/")[0] ?? "";
  return id.length > 0 ? id : undefined;
}

function isLibraryActive(pathname: string, to: string): boolean {
  if (pathname === to) return true;
  if (!pathname.startsWith(`${to}/`)) return false;
  const first = pathname.slice(to.length + 1).split("/")[0] ?? "";
  return first.length > 0 && !RESERVED_SEGMENTS.has(first);
}

function NavItem({
  to,
  label,
  icon,
  count,
  onNavigate,
  match = "exact",
  onPrefetch,
  navLink,
}: {
  to: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  onNavigate?: () => void;
  match?: "exact" | "library" | "prefix";
  onPrefetch?: () => void;
  navLink?: string;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active =
    match === "library"
      ? isLibraryActive(pathname, to)
      : match === "prefix"
        ? pathname === to || pathname.startsWith(`${to}/`)
        : pathname === to;

  return (
    <NavLink
      label={label}
      leftSection={icon}
      rightSection={
        count != null ? (
          <Badge size="sm" variant="light" color="gray" className={classes.navCount}>
            {count.toLocaleString()}
          </Badge>
        ) : undefined
      }
      active={active}
      data-nav-link={navLink}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      onPointerDown={onPrefetch}
      onClick={() => {
        onNavigate?.();
        if (to === "/movies" || to === "/shows" || to === "/music") {
          void navigate({ to, search: allLibrarySearch });
        } else if (to === "/issues") {
          void navigate({ to, search: allIssuesSearch });
        } else {
          void navigate({ to });
        }
      }}
    />
  );
}

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const [pageHeader, setPageHeader] = useState<PageHeaderInfo>({});
  const queryClient = useQueryClient();
  useSyncRevisionInvalidation(true);
  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: getDashboardStats,
    staleTime: 60_000,
    refetchInterval: focusAwareRefetchInterval(30_000),
  });

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  const navigate = useNavigate();
  const stats = statsQuery.data;
  const instances = instancesQuery.data?.instances ?? [];
  const radarrInstances = useMemo(
    () => instances.filter((i) => i.kind === "radarr"),
    [instances],
  );
  const sonarrInstances = useMemo(
    () => instances.filter((i) => i.kind === "sonarr"),
    [instances],
  );
  const lidarrInstances = useMemo(
    () => instances.filter((i) => i.kind === "lidarr"),
    [instances],
  );
  const seerrInstances = useMemo(
    () => instances.filter((i) => i.kind === "seerr"),
    [instances],
  );

  const moviesPathId =
    instanceIdFromPath(pathname, "/movies") ?? instanceFromSearch(pathname, "/movies", searchStr);
  const showsPathId =
    instanceIdFromPath(pathname, "/shows") ?? instanceFromSearch(pathname, "/shows", searchStr);
  const musicPathId =
    instanceIdFromPath(pathname, "/music") ?? instanceFromSearch(pathname, "/music", searchStr);
  const requestsPathId = instanceIdFromPath(pathname, "/requests");

  useEffect(() => {
    if (moviesPathId && radarrInstances.some((instance) => instance.id === moviesPathId)) {
      setLastInstanceId("radarr", moviesPathId);
    }
    if (showsPathId && sonarrInstances.some((instance) => instance.id === showsPathId)) {
      setLastInstanceId("sonarr", showsPathId);
    }
    if (musicPathId && lidarrInstances.some((instance) => instance.id === musicPathId)) {
      setLastInstanceId("lidarr", musicPathId);
    }
    if (requestsPathId && seerrInstances.some((instance) => instance.id === requestsPathId)) {
      setLastInstanceId("seerr", requestsPathId);
    }
  }, [
    moviesPathId,
    showsPathId,
    musicPathId,
    requestsPathId,
    searchStr,
    radarrInstances,
    sonarrInstances,
    lidarrInstances,
    seerrInstances,
  ]);

  const title = pageHeader.title ?? titleFromPath(pathname);
  const count = pageHeader.count;
  const backTo = pageHeader.backTo;
  const navCounts = stats?.nav;

  function prefetchMovies() {
    prefetchMovieLibrary(queryClient);
  }

  function prefetchShows() {
    prefetchShowLibrary(queryClient);
  }

  function prefetchArtists() {
    prefetchArtistLibrary(queryClient);
  }

  function prefetchQueueNav() {
    prefetchQueue(queryClient);
  }

  function prefetchHistoryNav() {
    prefetchHistory(queryClient);
  }

  function prefetchRequestsNav() {
    prefetchRequests(queryClient);
  }

  function prefetchIssuesNav() {
    prefetchIssues(queryClient);
  }

  const hasRadarr = radarrInstances.length > 0;
  const hasSonarr = sonarrInstances.length > 0;
  const hasLidarr = lidarrInstances.length > 0;

  const libraryKinds = [
    hasRadarr ? "radarr" : null,
    hasSonarr ? "sonarr" : null,
    hasLidarr ? "lidarr" : null,
  ]
    .filter(Boolean)
    .join(",");

  useEffect(() => {
    if (!hasRadarr && !hasSonarr && !hasLidarr) return;

    const timers: number[] = [];
    const run = () => {
      let delay = 0;
      if (hasRadarr) {
        const timer = window.setTimeout(() => prefetchMovieHead(queryClient), delay);
        timers.push(timer);
        delay += 50;
      }
      if (hasSonarr) {
        const timer = window.setTimeout(() => prefetchShowHead(queryClient), delay);
        timers.push(timer);
        delay += 50;
      }
      if (hasLidarr) {
        const timer = window.setTimeout(() => prefetchArtistHead(queryClient), delay);
        timers.push(timer);
      }
    };

    let cancelIdle: (() => void) | undefined;
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(run, { timeout: 2000 });
      cancelIdle = () => window.cancelIdleCallback(idleId);
    } else {
      const timeoutId = window.setTimeout(run, 200);
      cancelIdle = () => window.clearTimeout(timeoutId);
    }

    return () => {
      cancelIdle?.();
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [hasRadarr, hasSonarr, hasLidarr, libraryKinds, queryClient]);

  return (
    <PageHeaderContext.Provider value={setPageHeader}>
      <AppShell
        layout="alt"
        header={{ height: 60 }}
        navbar={{
          width: 280,
          breakpoint: "sm",
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header px="md">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }} align="center">
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              {backTo ? (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label="Back"
                  onClick={() => void navigate({ to: backTo })}
                >
                  <ArrowLeftIcon size={20} />
                </ActionIcon>
              ) : null}
              <Title order={3} style={{ lineHeight: 1.2, minWidth: 0 }}>
                {title}
                {count ? (
                  <Text span size="sm" c="dimmed" fw={400} ml={8}>
                    - {count}
                  </Text>
                ) : null}
              </Title>
            </Group>

            <Group gap="xs" wrap="nowrap">
              <Badge variant="light" color="blue">
                Queue {stats?.queueCount ?? "—"}
              </Badge>
              <Badge variant="light" color="orange">
                Missing {stats?.missingCount ?? "—"}
              </Badge>
              <Badge
                variant="light"
                color={stats && stats.instancesOnline === stats.instancesTotal ? "green" : "red"}
              >
                Instances {stats ? `${stats.instancesOnline}/${stats.instancesTotal}` : "—"}
              </Badge>
              <UnstyledButton
                aria-label="Search"
                title="Search (coming soon)"
                style={{ display: "flex", alignItems: "center" }}
              >
                <MagnifyingGlassIcon size={20} />
              </UnstyledButton>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar className={classes.navbar}>
          <div className={classes.sidebarHeader} data-sidebar-header>
            <img src={umbrellarrIcon} alt="" className={classes.sidebarLogo} />
            <span className={classes.sidebarTitle}>Umbrellarr</span>
          </div>

          <ScrollArea className={classes.navScroll} type="hover" offsetScrollbars>
            <div className={classes.navBody}>
              {hasRadarr ? (
                <NavItem
                  to="/movies"
                  label="Movies"
                  icon={<FilmStripIcon />}
                  count={navCounts?.movies}
                  match="library"
                  navLink="movies"
                  onNavigate={close}
                  onPrefetch={prefetchMovies}
                />
              ) : null}

              {hasSonarr ? (
                <NavItem
                  to="/shows"
                  label="Shows"
                  icon={<TelevisionIcon />}
                  count={navCounts?.shows}
                  match="library"
                  navLink="shows"
                  onNavigate={close}
                  onPrefetch={prefetchShows}
                />
              ) : null}

              {hasLidarr ? (
                <NavItem
                  to="/music"
                  label="Music"
                  icon={<MusicNotesIcon />}
                  count={navCounts?.music}
                  match="library"
                  navLink="music"
                  onNavigate={close}
                  onPrefetch={prefetchArtists}
                />
              ) : null}

              {seerrInstances.length > 0 ? (
                <>
                  <NavItem
                    to="/requests"
                    label="Requests"
                    icon={<TicketIcon />}
                    count={navCounts?.requests}
                    match="prefix"
                    navLink="requests"
                    onNavigate={close}
                    onPrefetch={prefetchRequestsNav}
                  />
                  <NavItem
                    to="/issues"
                    label="Issues"
                    icon={<WarningCircleIcon />}
                    count={navCounts?.issues}
                    match="prefix"
                    navLink="issues"
                    onNavigate={close}
                    onPrefetch={prefetchIssuesNav}
                  />
                </>
              ) : null}

              <NavItem
                to="/activity/queue"
                label="Queue"
                icon={<DownloadSimpleIcon />}
                count={navCounts?.queue}
                match="prefix"
                navLink="queue"
                onNavigate={close}
                onPrefetch={prefetchQueueNav}
              />
              <NavItem
                to="/activity/history"
                label="History"
                icon={<ClockCounterClockwiseIcon />}
                count={navCounts?.history}
                match="prefix"
                navLink="history"
                onNavigate={close}
                onPrefetch={prefetchHistoryNav}
              />
              <NavItem
                to="/activity/calendar"
                label="Calendar"
                icon={<CalendarBlankIcon />}
                match="prefix"
                navLink="calendar"
                onNavigate={close}
              />
              <NavItem
                to="/settings"
                label="Settings"
                icon={<GearSixIcon />}
                navLink="settings"
                onNavigate={close}
              />
            </div>
          </ScrollArea>

          <div className={classes.navFooter}>
            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                Appearance
              </Text>
              <SegmentedControl
                fullWidth
                size="xs"
                value={colorScheme === "auto" ? "dark" : colorScheme}
                onChange={(value) => setColorScheme(value as "light" | "dark")}
                data={[
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" },
                ]}
              />
              <UnstyledButton
                style={{ borderRadius: "var(--mantine-radius-sm)" }}
                onClick={async () => {
                  await logout();
                  clearAuthStatusCache(queryClient);
                  window.location.href = "/login";
                }}
              >
                <Group gap="xs">
                  <SignOutIcon />
                  <Text size="sm">Sign out</Text>
                </Group>
              </UnstyledButton>
            </Stack>
          </div>
        </AppShell.Navbar>

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </PageHeaderContext.Provider>
  );
}
