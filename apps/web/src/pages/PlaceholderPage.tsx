import { Alert, Stack, Text } from "@mantine/core";
import { usePageHeader } from "@/layout/pageHeader";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  usePageHeader(title);

  return (
    <Stack gap="md">
      <Text c="dimmed">{description}</Text>
      <Alert title="Coming next" color="gray">
        This view is scaffolded. Media data from Radarr/Sonarr will land here in the next milestones.
      </Alert>
    </Stack>
  );
}
