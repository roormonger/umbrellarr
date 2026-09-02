import { Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import type {
  QueueBlocklistMode,
  QueueListItem,
  QueueRemovalMethod,
  QueueRemoveRequest,
} from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";

type Props = {
  opened: boolean;
  items: QueueListItem[];
  removing?: boolean;
  onClose: () => void;
  onConfirm: (request: Omit<QueueRemoveRequest, "ids">) => void;
};

const REMOVAL_OPTIONS: Array<{ value: QueueRemovalMethod; label: string }> = [
  { value: "removeFromClient", label: "Remove from Download Client" },
  { value: "changeCategory", label: "Change Category" },
  { value: "ignore", label: "Ignore Download" },
];

const BLOCKLIST_OPTIONS: Array<{ value: QueueBlocklistMode; label: string }> = [
  { value: "doNotBlocklist", label: "Do Not Blocklist" },
  { value: "blocklistAndSearch", label: "Blocklist and Search" },
  { value: "blocklistOnly", label: "Blocklist Only" },
];

function removalHelp(method: QueueRemovalMethod): string {
  if (method === "removeFromClient") {
    return "'Remove from Download Client' will remove the download and the file(s) from the download client.";
  }
  if (method === "changeCategory") {
    return "'Change Category' will move the download to the post-import category in the download client.";
  }
  return "'Ignore Download' will remove the item from the queue without affecting the download client.";
}

function blocklistHelp(mode: QueueBlocklistMode): string {
  if (mode === "blocklistAndSearch") {
    return "Blocks this release and searches for a replacement.";
  }
  if (mode === "blocklistOnly") {
    return "Blocks this release from being redownloaded via RSS or Automatic Search.";
  }
  return "Blocks this release from being redownloaded by Arr via RSS or Automatic Search.";
}

export function QueueRemoveModal({ opened, items, removing, onClose, onConfirm }: Props) {
  const [removalMethod, setRemovalMethod] = useState<QueueRemovalMethod>("removeFromClient");
  const [blocklistMode, setBlocklistMode] = useState<QueueBlocklistMode>("doNotBlocklist");

  const pending = items.some((i) => i.isPending);
  const canChangeCategory = items.every((i) => i.downloadClientHasPostImportCategory);

  useEffect(() => {
    if (!opened) return;
    setRemovalMethod("removeFromClient");
    setBlocklistMode("doNotBlocklist");
  }, [opened]);

  const removalData = useMemo(
    () =>
      REMOVAL_OPTIONS.map((o) => ({
        ...o,
        disabled:
          (o.value === "ignore" && pending) ||
          (o.value === "changeCategory" && !canChangeCategory),
      })),
    [canChangeCategory, pending],
  );

  const blocklistData = useMemo(
    () =>
      BLOCKLIST_OPTIONS.map((o) => ({
        ...o,
        disabled: o.value === "blocklistAndSearch" && pending,
      })),
    [pending],
  );

  const title =
    items.length === 1
      ? `Remove - ${items[0]?.title ?? "queue item"}`
      : `Remove ${items.length} queue items`;

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="lg" centered>
      <Stack gap="md">
        <Text size="sm">
          {items.length === 1
            ? `Are you sure you want to remove '${items[0]?.title ?? "this item"}' from the queue?`
            : `Are you sure you want to remove ${items.length} items from the queue?`}
        </Text>

        <Select
          label="Removal Method"
          data={removalData}
          value={removalMethod}
          onChange={(v) => v && setRemovalMethod(v as QueueRemovalMethod)}
          allowDeselect={false}
          description={
            <Text size="xs" c="orange">
              {removalHelp(removalMethod)}
            </Text>
          }
        />

        <Select
          label="Blocklist Release"
          data={blocklistData}
          value={blocklistMode}
          onChange={(v) => v && setBlocklistMode(v as QueueBlocklistMode)}
          allowDeselect={false}
          description={
            <Text size="xs" c="dimmed">
              {blocklistHelp(blocklistMode)}
            </Text>
          }
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={removing}>
            Close
          </Button>
          <Button
            color="red"
            loading={removing}
            onClick={() => onConfirm({ removalMethod, blocklistMode })}
          >
            Remove
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
