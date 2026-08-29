import { Badge, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { getInstanceStatuses } from "@/api/instances";
import { usePageHeader } from "@/layout/pageHeader";

export function StatusPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["instances", "status"],
    queryFn: getInstanceStatuses,
    refetchInterval: 15_000,
  });

  const online = data?.statuses.filter((s) => s.online).length;
  const total = data?.statuses.length;
  usePageHeader(
    "Status",
    total != null ? `${online ?? 0}/${total}` : isLoading ? "Checking…" : null,
  );

  return (
    <Stack gap="md">
      <Text c="dimmed">
        Configured Arr clients. Manage them under Settings.
      </Text>

      {isLoading && <Text c="dimmed">Checking instances…</Text>}
      {error && (
        <Text c="red">{error instanceof Error ? error.message : "Failed to load status"}</Text>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {(data?.statuses ?? []).map((instance) => (
          <Card key={instance.id} withBorder padding="lg">
            <Group justify="space-between" mb="xs">
              <Text fw={600}>{instance.name}</Text>
              <Badge color={instance.online ? "green" : "red"}>
                {instance.online ? "Online" : "Offline"}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {instance.kind} · {instance.baseUrl}
            </Text>
            {instance.version && (
              <Text size="sm" mt="xs">
                Version {instance.version}
              </Text>
            )}
            {instance.error && (
              <Text size="sm" c="red" mt="xs">
                {instance.error}
              </Text>
            )}
          </Card>
        ))}
      </SimpleGrid>

      {!isLoading && (data?.statuses.length ?? 0) === 0 && (
        <Text c="dimmed">
          No Arr clients configured. Add Radarr or Sonarr under Settings.
        </Text>
      )}
    </Stack>
  );
}
