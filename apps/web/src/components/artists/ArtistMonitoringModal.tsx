import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import {
  ARTIST_ALBUM_MONITOR_OPTIONS,
  type ArtistAlbumMonitor,
} from "@umbrellarr/shared";
import { useEffect, useState } from "react";
import { updateArtistMonitoring } from "@/api/artists";

const NO_CHANGE = "noChange";

type Props = {
  opened: boolean;
  onClose: () => void;
  instanceId: string;
  artistId: number;
  title: string;
};

const MONITOR_HELP =
  "All Albums, Future Albums, Missing Albums, Existing Albums, First Album, Latest Album, or None — applied once to albums already on this artist.";

export function ArtistMonitoringModal({
  opened,
  onClose,
  instanceId,
  artistId,
  title,
}: Props) {
  const queryClient = useQueryClient();
  const [monitor, setMonitor] = useState<string>(NO_CHANGE);

  useEffect(() => {
    if (opened) setMonitor(NO_CHANGE);
  }, [opened]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (monitor === NO_CHANGE) throw new Error("Choose a monitoring option");
      return updateArtistMonitoring(instanceId, artistId, {
        monitor: monitor as ArtistAlbumMonitor,
      });
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        message: `Updated album monitoring for “${title}”`,
      });
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["artist", instanceId, artistId] });
      await queryClient.invalidateQueries({ queryKey: ["artist-albums", instanceId, artistId] });
      await queryClient.invalidateQueries({ queryKey: ["artists"] });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Monitoring update failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Monitor Artist" size="md" centered>
      <Stack gap="md">
        <Alert color="violet" variant="light">
          <Text size="sm">
            This is a one off adjustment of the monitored setting for each album. Use the
            option under Artist/Edit to control what happens for newly added albums.
          </Text>
        </Alert>

        <Select
          label={
            <Group gap={6} wrap="nowrap">
              <span>Existing Albums</span>
              <Tooltip label={MONITOR_HELP} multiline maw={280} withArrow>
                <InfoIcon size={14} aria-label="Monitoring options" />
              </Tooltip>
            </Group>
          }
          data={[
            { value: NO_CHANGE, label: "No Change" },
            ...ARTIST_ALBUM_MONITOR_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            })),
          ]}
          value={monitor}
          onChange={(value) => setMonitor(value ?? NO_CHANGE)}
          allowDeselect={false}
        />
      </Stack>

      <Group justify="flex-end" mt="lg" gap="sm">
        <Button variant="default" onClick={onClose} disabled={saveMutation.isPending}>
          Cancel
        </Button>
        <Button
          loading={saveMutation.isPending}
          disabled={monitor === NO_CHANGE}
          onClick={() => saveMutation.mutate()}
        >
          Save
        </Button>
      </Group>
    </Modal>
  );
}
