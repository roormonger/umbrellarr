import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { getInstanceStatuses } from "@/api/instances";

export function StatusPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["instances", "status"],
    queryFn: getInstanceStatuses,
    refetchInterval: 15_000,
  });

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Status</Title>
        <Text c="dimmed" mt={4}>
          Configured Radarr/Sonarr instances (read-only from environment)
        </Text>
      </div>

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
          No instances configured. Set RADARR_URL / SONARR_URL and matching API keys in the
          environment.
        </Text>
      )}
    </Stack>
  );
}
