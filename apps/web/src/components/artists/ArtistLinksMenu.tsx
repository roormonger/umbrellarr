import { Button, Group, Loader, Popover, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getArtistLinks } from "@/api/artists";

type Props = {
  opened: boolean;
  onChange: (opened: boolean) => void;
  instanceId: string;
  artistId: number;
  children: ReactNode;
};

export function ArtistLinksMenu({ opened, onChange, instanceId, artistId, children }: Props) {
  const linksQuery = useQuery({
    queryKey: ["artist-links", instanceId, artistId],
    queryFn: () => getArtistLinks(instanceId, artistId),
    enabled: opened,
    staleTime: 60_000,
  });

  return (
    <Popover
      opened={opened}
      onChange={onChange}
      position="top"
      withArrow
      shadow="md"
      width={340}
      withinPortal
    >
      <Popover.Target>{children}</Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text size="sm" fw={600}>
            Links
          </Text>
          {linksQuery.isLoading && (
            <Group justify="center" py="xs">
              <Loader size="xs" />
            </Group>
          )}
          {linksQuery.error && (
            <Text size="sm" c="red">
              {linksQuery.error instanceof Error
                ? linksQuery.error.message
                : "Failed to load links"}
            </Text>
          )}
          {linksQuery.data && (
            <Group gap={6}>
              {linksQuery.data.links.map((link) => (
                <Button
                  key={link.id}
                  size="compact-xs"
                  component="a"
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  color="violet"
                >
                  {link.label}
                </Button>
              ))}
              {linksQuery.data.links.length === 0 && (
                <Text size="sm" c="dimmed">
                  No links available for this artist.
                </Text>
              )}
            </Group>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
