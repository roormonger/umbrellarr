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
import { useState, type ReactNode } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { FilmStripIcon } from "@phosphor-icons/react/dist/csr/FilmStrip";
import { TelevisionIcon } from "@phosphor-icons/react/dist/csr/Television";
import { MusicNotesIcon } from "@phosphor-icons/react/dist/csr/MusicNotes";
import { ListBulletsIcon } from "@phosphor-icons/react/dist/csr/ListBullets";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { HeartbeatIcon } from "@phosphor-icons/react/dist/csr/Heartbeat";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { SignOutIcon } from "@phosphor-icons/react/dist/csr/SignOut";
import { PulseIcon } from "@phosphor-icons/react/dist/csr/Pulse";
import { clearAuthStatusCache, logout } from "@/api/auth";
import { listInstances } from "@/api/instances";
import { listMovies } from "@/api/movies";
import { listArtists } from "@/api/artists";
import { listShows } from "@/api/shows";
import { getDashboardStats } from "@/api/stats";
import umbrellarrIcon from "@/assets/umbrellarr-icon.png";
import {
  PageHeaderContext,
  titleFromPath,
  type PageHeaderInfo,
} from "@/layout/pageHeader";

function NavItem({
  to,
  label,
  icon,
  onNavigate,
  exact,
  onPrefetch,
}: {
  to: string;
  label: string;
  icon?: ReactNode;
  onNavigate?: () => void;
  exact?: boolean;
  onPrefetch?: () => void;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <NavLink
      label={label}
      leftSection={icon}
      active={active}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      onClick={() => {
        onNavigate?.();
        void navigate({ to });
      }}
    />
  );
}

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [pageHeader, setPageHeader] = useState<PageHeaderInfo>({});
  const queryClient = useQueryClient();
  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: getDashboardStats,
    refetchInterval: 30_000,
  });

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  const navigate = useNavigate();
  const stats = statsQuery.data;
  const radarrInstances = (instancesQuery.data?.instances ?? []).filter((i) => i.kind === "radarr");
  const sonarrInstances = (instancesQuery.data?.instances ?? []).filter((i) => i.kind === "sonarr");
  const lidarrInstances = (instancesQuery.data?.instances ?? []).filter((i) => i.kind === "lidarr");
  const title = pageHeader.title ?? titleFromPath(pathname);
  const count = pageHeader.count;
  const backTo = pageHeader.backTo;

  function prefetchMovies(instanceId: string) {
    void queryClient.prefetchQuery({
      queryKey: ["movies", instanceId],
      queryFn: () => listMovies(instanceId),
      staleTime: 60_000,
    });
  }

  function prefetchShows(instanceId: string) {
    void queryClient.prefetchQuery({
      queryKey: ["shows", instanceId],
      queryFn: () => listShows(instanceId),
      staleTime: 60_000,
    });
  }

  function prefetchArtists(instanceId: string) {
    void queryClient.prefetchQuery({
      queryKey: ["artists", instanceId],
      queryFn: () => listArtists(instanceId),
      staleTime: 60_000,
    });
  }

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

        <AppShell.Navbar p="md">
          <AppShell.Section>
            <Group gap="xs" wrap="nowrap" mb="xs">
              <img
                src={umbrellarrIcon}
                alt=""
                width={28}
                height={28}
                style={{ display: "block", borderRadius: 6, flexShrink: 0 }}
              />
              <Text fw={700} size="sm">
                Umbrellarr
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mb="md">
              Media operator console
            </Text>
          </AppShell.Section>

          <AppShell.Section grow component={ScrollArea} type="hover">
            <Stack gap={4}>
              {radarrInstances.length > 0 && (
                <NavLink
                  label="Movies"
                  leftSection={<FilmStripIcon />}
                  defaultOpened
                  childrenOffset={16}
                >
                  {radarrInstances.map((instance) => (
                    <NavItem
                      key={instance.id}
                      to={`/movies/${instance.id}`}
                      label={instance.name}
                      onNavigate={close}
                      onPrefetch={() => prefetchMovies(instance.id)}
                    />
                  ))}
                </NavLink>
              )}

              {sonarrInstances.length > 0 && (
                <NavLink
                  label="Shows"
                  leftSection={<TelevisionIcon />}
                  defaultOpened
                  childrenOffset={16}
                >
                  {sonarrInstances.map((instance) => (
                    <NavItem
                      key={instance.id}
                      to={`/shows/${instance.id}`}
                      label={instance.name}
                      onNavigate={close}
                      onPrefetch={() => prefetchShows(instance.id)}
                    />
                  ))}
                </NavLink>
              )}

              {lidarrInstances.length > 0 && (
                <NavLink
                  label="Music"
                  leftSection={<MusicNotesIcon />}
                  defaultOpened
                  childrenOffset={16}
                >
                  {lidarrInstances.map((instance) => (
                    <NavItem
                      key={instance.id}
                      to={`/music/${instance.id}`}
                      label={instance.name}
                      onNavigate={close}
                      onPrefetch={() => prefetchArtists(instance.id)}
                    />
                  ))}
                </NavLink>
              )}

              <NavLink label="Activity" leftSection={<PulseIcon />} defaultOpened childrenOffset={16}>
                <NavItem to="/activity/queue" label="Queue" icon={<ListBulletsIcon />} onNavigate={close} />
                <NavItem
                  to="/activity/calendar"
                  label="Calendar"
                  icon={<CalendarBlankIcon />}
                  onNavigate={close}
                />
                <NavItem
                  to="/activity/missing"
                  label="Missing"
                  icon={<WarningCircleIcon />}
                  onNavigate={close}
                />
              </NavLink>

              <NavItem to="/status" label="Status" icon={<HeartbeatIcon />} onNavigate={close} />
              <NavItem to="/settings" label="Settings" icon={<GearSixIcon />} onNavigate={close} />
            </Stack>
          </AppShell.Section>

          <AppShell.Section mt="md">
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
          </AppShell.Section>
        </AppShell.Navbar>

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </PageHeaderContext.Provider>
  );
}
