import {
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
import type { ReactNode } from "react";
import { FilmStripIcon } from "@phosphor-icons/react/dist/csr/FilmStrip";
import { TelevisionIcon } from "@phosphor-icons/react/dist/csr/Television";
import { ListBulletsIcon } from "@phosphor-icons/react/dist/csr/ListBullets";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { HeartbeatIcon } from "@phosphor-icons/react/dist/csr/Heartbeat";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { SignOutIcon } from "@phosphor-icons/react/dist/csr/SignOut";
import { BooksIcon } from "@phosphor-icons/react/dist/csr/Books";
import { PulseIcon } from "@phosphor-icons/react/dist/csr/Pulse";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/api/stats";
import { logout } from "@/api/auth";

function NavItem({
  to,
  label,
  icon,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === to || pathname.startsWith(`${to}/`);

  return (
    <NavLink
      component={Link}
      to={to}
      label={label}
      leftSection={icon}
      active={active}
      onClick={onNavigate}
    />
  );
}

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: getDashboardStats,
    refetchInterval: 30_000,
  });

  const stats = statsQuery.data;

  return (
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
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4}>Umbrellarr</Title>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Badge variant="light" color="blue">
              Queue {stats?.queueCount ?? "—"}
            </Badge>
            <Badge variant="light" color="orange">
              Missing {stats?.missingCount ?? "—"}
            </Badge>
            <Badge variant="light" color={stats && stats.instancesOnline === stats.instancesTotal ? "green" : "red"}>
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
          <Text fw={700} size="sm" mb="xs">
            Umbrellarr
          </Text>
          <Text size="xs" c="dimmed" mb="md">
            Media operator console
          </Text>
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea} type="hover">
          <Stack gap={4}>
            <NavLink label="Library" leftSection={<BooksIcon />} defaultOpened childrenOffset={16}>
              <NavItem to="/library/movies" label="Movies" icon={<FilmStripIcon />} onNavigate={close} />
              <NavItem to="/library/shows" label="Shows" icon={<TelevisionIcon />} onNavigate={close} />
            </NavLink>

            <NavLink label="Activity" leftSection={<PulseIcon />} defaultOpened childrenOffset={16}>
              <NavItem to="/activity/queue" label="Queue" icon={<ListBulletsIcon />} onNavigate={close} />
              <NavItem to="/activity/calendar" label="Calendar" icon={<CalendarBlankIcon />} onNavigate={close} />
              <NavItem to="/activity/missing" label="Missing" icon={<WarningCircleIcon />} onNavigate={close} />
            </NavLink>

            <NavItem to="/status" label="Status" icon={<HeartbeatIcon />} onNavigate={close} />
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
              onClick={async () => {
                await logout();
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
  );
}
