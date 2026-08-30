import {
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArrKind, InstancePublic, InstanceStatus } from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import {
  createInstance,
  deleteInstance,
  getInstanceStatuses,
  listInstances,
  testInstance,
  updateInstance,
} from "@/api/instances";
import { usePageHeader } from "@/layout/pageHeader";

type FormState = {
  name: string;
  kind: ArrKind;
  baseUrl: string;
  apiKey: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  kind: "radarr",
  baseUrl: "",
  apiKey: "",
};

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InstancePublic | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [testResult, setTestResult] = useState<string | null>(null);

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
  });

  const statusQuery = useQuery({
    queryKey: ["instances", "status"],
    queryFn: getInstanceStatuses,
    refetchInterval: 30_000,
  });

  const instances = instancesQuery.data?.instances ?? [];
  const statusById = useMemo(() => {
    const map = new Map<string, InstanceStatus>();
    for (const s of statusQuery.data?.statuses ?? []) {
      map.set(s.id, s);
    }
    return map;
  }, [statusQuery.data?.statuses]);

  usePageHeader("Settings", instances.length ? String(instances.length) : null);

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      setForm({
        name: editing.name,
        kind: editing.kind,
        baseUrl: editing.baseUrl,
        apiKey: "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setTestResult(null);
  }, [modalOpen, editing]);

  async function invalidateAll() {
    await queryClient.invalidateQueries({ queryKey: ["instances"] });
    await queryClient.invalidateQueries({ queryKey: ["movies"] });
    await queryClient.invalidateQueries({ queryKey: ["shows"] });
    await queryClient.invalidateQueries({ queryKey: ["artists"] });
    await queryClient.invalidateQueries({ queryKey: ["stats"] });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return updateInstance(editing.id, {
          name: form.name.trim(),
          kind: form.kind,
          baseUrl: form.baseUrl.trim(),
          apiKey: form.apiKey.trim() || undefined,
        });
      }
      return createInstance({
        name: form.name.trim(),
        kind: form.kind,
        baseUrl: form.baseUrl.trim(),
        apiKey: form.apiKey.trim(),
      });
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        message: editing ? "Client updated" : "Client added",
      });
      setModalOpen(false);
      setEditing(null);
      await invalidateAll();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Save failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInstance(id),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Client removed" });
      await invalidateAll();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Delete failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: () =>
      testInstance({
        id: editing?.id,
        kind: form.kind,
        baseUrl: form.baseUrl.trim(),
        apiKey: form.apiKey.trim() || undefined,
      }),
    onSuccess: (result) => {
      if (result.online) {
        setTestResult(result.version ? `Online · v${result.version}` : "Online");
      } else {
        setTestResult(result.error ?? "Connection failed");
      }
    },
    onError: (error) => {
      setTestResult(error instanceof Error ? error.message : "Connection failed");
    },
  });

  const canSave =
    form.name.trim().length > 0 &&
    form.baseUrl.trim().length > 0 &&
    (editing ? true : form.apiKey.trim().length > 0);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Text c="dimmed" size="sm" maw={520}>
          Add Radarr, Sonarr, and Lidarr clients here. Names appear in the sidebar under Movies,
          Shows, and Music. API keys are stored encrypted on the server and never sent back to the
          browser.
        </Text>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          Add client
        </Button>
      </Group>

      {(instancesQuery.isLoading || statusQuery.isLoading) && (
        <Text c="dimmed" size="sm">
          Loading clients…
        </Text>
      )}

      {instancesQuery.error && (
        <Text c="red" size="sm">
          {instancesQuery.error instanceof Error
            ? instancesQuery.error.message
            : "Failed to load clients"}
        </Text>
      )}

      {!instancesQuery.isLoading && instances.length === 0 && (
        <Text c="dimmed" size="sm">
          No Arr clients yet. Add one, or restart with RADARR_*/SONARR_*/LIDARR_* env vars for a
          one-time import.
        </Text>
      )}

      {instances.length > 0 && (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Kind</Table.Th>
              <Table.Th>URL</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th w={160} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {instances.map((instance) => {
              const status = statusById.get(instance.id);
              return (
                <Table.Tr key={instance.id}>
                  <Table.Td>
                    <Text fw={600}>{instance.name}</Text>
                    <Text size="xs" c="dimmed">
                      {instance.id}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light">{instance.kind}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" style={{ wordBreak: "break-all" }}>
                      {instance.baseUrl}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {status ? (
                      <Stack gap={2}>
                        <Badge color={status.online ? "green" : "red"} variant="light">
                          {status.online ? "Online" : "Offline"}
                        </Badge>
                        {status.version && (
                          <Text size="xs" c="dimmed">
                            v{status.version}
                          </Text>
                        )}
                        {status.error && (
                          <Text size="xs" c="red">
                            {status.error}
                          </Text>
                        )}
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end">
                      <Button
                        size="xs"
                        variant="default"
                        onClick={() => {
                          setEditing(instance);
                          setModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        loading={deleteMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remove “${instance.name}” from Umbrellarr? This does not delete anything in ${instance.kind}.`,
                            )
                          ) {
                            deleteMutation.mutate(instance.id);
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => {
          if (saveMutation.isPending) return;
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit client" : "Add client"}
        centered
      >
        <Stack gap="sm">
          <TextInput
            label="Name"
            description="Shown in the sidebar under Movies, Shows, or Music"
            value={form.name}
            onChange={(e) => {
              const name = e.currentTarget.value;
              setForm((prev) => ({ ...prev, name }));
            }}
            placeholder="Radarr 4K"
            required
          />
          <Select
            label="Kind"
            data={[
              { value: "radarr", label: "Radarr (Movies)" },
              { value: "sonarr", label: "Sonarr (Shows)" },
              { value: "lidarr", label: "Lidarr (Music)" },
            ]}
            value={form.kind}
            allowDeselect={false}
            onChange={(value) =>
              setForm((prev) => ({ ...prev, kind: (value as ArrKind) ?? "radarr" }))
            }
          />
          <TextInput
            label="Base URL"
            value={form.baseUrl}
            onChange={(e) => {
              const baseUrl = e.currentTarget.value;
              setForm((prev) => ({ ...prev, baseUrl }));
            }}
            placeholder="http://localhost:7878"
            required
          />
          <TextInput
            label="API key"
            description={editing ? "Leave blank to keep the current key" : undefined}
            value={form.apiKey}
            onChange={(e) => {
              const apiKey = e.currentTarget.value;
              setForm((prev) => ({ ...prev, apiKey }));
            }}
            placeholder={editing ? "••••••••" : "Arr API key"}
            required={!editing}
          />

          <Group justify="space-between" mt="xs">
            <Button
              variant="default"
              loading={testMutation.isPending}
              disabled={!form.baseUrl.trim() || (!editing && !form.apiKey.trim())}
              onClick={() => testMutation.mutate()}
            >
              Test connection
            </Button>
            <Group gap="sm">
              <Button
                variant="default"
                onClick={() => {
                  setModalOpen(false);
                  setEditing(null);
                }}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                loading={saveMutation.isPending}
                disabled={!canSave}
                onClick={() => saveMutation.mutate()}
              >
                Save
              </Button>
            </Group>
          </Group>
          {testResult && (
            <Text size="sm" c={testResult.startsWith("Online") ? "teal" : "red"}>
              {testResult}
            </Text>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
