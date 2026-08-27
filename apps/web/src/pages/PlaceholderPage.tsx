import { Alert, Stack, Text, Title } from "@mantine/core";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <Stack gap="md">
      <div>
        <Title order={2}>{title}</Title>
        <Text c="dimmed" mt={4}>
          {description}
        </Text>
      </div>
      <Alert title="Coming next" color="gray">
        This view is scaffolded. Media data from Radarr/Sonarr will land here in the next milestones.
      </Alert>
    </Stack>
  );
}
