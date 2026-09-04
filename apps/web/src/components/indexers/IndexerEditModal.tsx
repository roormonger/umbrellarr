import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IndexerCreateRequest, IndexerUpdateRequest } from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import {
  createIndexer,
  deleteIndexer,
  getIndexerEditDetail,
  getIndexerEditOptions,
  getIndexerSchemaTemplate,
  testIndexer,
  testIndexerCreate,
  updateIndexer,
} from "@/api/indexers";
import {
  IndexerProviderField,
  isIndexerFieldVisible,
} from "@/components/indexers/IndexerProviderField";

type EditProps = {
  mode?: "edit";
  opened: boolean;
  instanceId: string;
  indexerId: number;
  title: string;
  onClose: () => void;
};

type CreateProps = {
  mode: "create";
  opened: boolean;
  instanceId: string;
  schemaKey: string;
  title: string;
  onClose: () => void;
};

type Props = EditProps | CreateProps;

type FormSeed = {
  name: string;
  enable: boolean;
  redirect: boolean;
  appProfileId: number;
  priority: number;
  downloadClientId: number;
  tags: number[];
  protocol: "torrent" | "usenet";
  implementationName: string;
  supportsRedirect: boolean;
  supportsRss: boolean;
  fields: NonNullable<Awaited<ReturnType<typeof getIndexerEditDetail>>["fields"]>;
  implementation?: string;
  configContract?: string;
  definitionName?: string;
};

export function IndexerEditModal(props: Props) {
  const { opened, instanceId, title, onClose } = props;
  const isCreate = props.mode === "create";
  const indexerId = !isCreate ? props.indexerId : null;
  const schemaKey = isCreate ? props.schemaKey : null;
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["indexer", instanceId, indexerId],
    queryFn: () => getIndexerEditDetail(instanceId, indexerId!),
    enabled: opened && !isCreate && indexerId != null,
  });

  const templateQuery = useQuery({
    queryKey: ["indexer-schema-template", instanceId, schemaKey],
    queryFn: () => getIndexerSchemaTemplate(instanceId, schemaKey!),
    enabled: opened && isCreate && Boolean(schemaKey),
  });

  const optionsQuery = useQuery({
    queryKey: ["indexer-options", instanceId],
    queryFn: () => getIndexerEditOptions(instanceId),
    enabled: opened,
    staleTime: 5 * 60_000,
  });

  const [name, setName] = useState("");
  const [enable, setEnable] = useState(false);
  const [redirect, setRedirect] = useState(false);
  const [appProfileId, setAppProfileId] = useState<string | null>(null);
  const [priority, setPriority] = useState<number | string>(25);
  const [downloadClientId, setDownloadClientId] = useState("0");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [advanced, setAdvanced] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const seed: FormSeed | undefined = useMemo(() => {
    if (isCreate) {
      const template = templateQuery.data;
      if (!template) return undefined;
      return {
        name: template.name,
        enable: template.enable,
        redirect: template.redirect,
        appProfileId: template.appProfileId,
        priority: template.priority,
        downloadClientId: template.downloadClientId,
        tags: template.tags,
        protocol: template.protocol,
        implementationName: template.implementationName,
        supportsRedirect: template.supportsRedirect,
        supportsRss: template.supportsRss,
        fields: template.fields,
        implementation: template.implementation,
        configContract: template.configContract,
        definitionName: template.definitionName,
      };
    }
    const detail = detailQuery.data;
    if (!detail) return undefined;
    return {
      name: detail.name,
      enable: detail.enable,
      redirect: detail.redirect,
      appProfileId: detail.appProfileId,
      priority: detail.priority,
      downloadClientId: detail.downloadClientId,
      tags: detail.tags,
      protocol: detail.protocol,
      implementationName: detail.implementationName,
      supportsRedirect: detail.supportsRedirect,
      supportsRss: detail.supportsRss,
      fields: detail.fields,
    };
  }, [isCreate, templateQuery.data, detailQuery.data]);

  useEffect(() => {
    if (!seed) return;
    setName(seed.name);
    setEnable(seed.enable);
    setRedirect(seed.redirect);
    setAppProfileId(seed.appProfileId > 0 ? String(seed.appProfileId) : null);
    setPriority(seed.priority);
    setDownloadClientId(String(seed.downloadClientId));
    setTagIds(seed.tags.map(String));
    const next: Record<string, unknown> = {};
    for (const field of seed.fields) {
      next[field.name] = field.value;
    }
    setFieldValues(next);
    setSaveError(null);
    setAdvanced(false);
  }, [seed]);

  useEffect(() => {
    if (!isCreate || appProfileId != null) return;
    const first = optionsQuery.data?.appProfiles[0];
    if (first) setAppProfileId(String(first.id));
  }, [isCreate, appProfileId, optionsQuery.data?.appProfiles]);

  const profileOptions = useMemo(
    () =>
      (optionsQuery.data?.appProfiles ?? []).map((profile) => ({
        value: String(profile.id),
        label: profile.name,
      })),
    [optionsQuery.data?.appProfiles],
  );

  const tagOptions = useMemo(
    () =>
      (optionsQuery.data?.tags ?? []).map((tag) => ({
        value: String(tag.id),
        label: tag.label,
      })),
    [optionsQuery.data?.tags],
  );

  const protocolClients = useMemo(() => {
    const clients = optionsQuery.data?.downloadClients ?? [];
    if (!seed) return clients;
    const matched = clients.filter((client) => client.protocol === seed.protocol);
    return matched.length > 0 ? matched : clients;
  }, [optionsQuery.data?.downloadClients, seed]);

  const clientOptions = useMemo(
    () => [
      { value: "0", label: "Any" },
      ...protocolClients.map((client) => ({
        value: String(client.id),
        label: client.name,
      })),
    ],
    [protocolClients],
  );

  const showDownloadClient = protocolClients.length > 0 || downloadClientId !== "0";
  const redirectLocked = seed?.protocol === "usenet" && seed.supportsRedirect;
  const redirectDisabled = !seed?.supportsRedirect || redirectLocked;

  function buildUpdatePatch(): IndexerUpdateRequest | null {
    if (!seed) return null;
    const parsedPriority = typeof priority === "number" ? priority : Number(priority);
    return {
      name: name.trim(),
      enable,
      redirect: redirectLocked ? true : redirect,
      appProfileId: Number(appProfileId ?? seed.appProfileId),
      priority: Number.isFinite(parsedPriority) ? parsedPriority : seed.priority,
      downloadClientId: Number(downloadClientId) || 0,
      tags: tagIds.map(Number).filter((id) => Number.isFinite(id)),
      fields: seed.fields.map((field) => ({
        name: field.name,
        value: Object.prototype.hasOwnProperty.call(fieldValues, field.name)
          ? (fieldValues[field.name] ?? null)
          : (field.value ?? null),
      })),
    };
  }

  function buildCreatePatch(): IndexerCreateRequest | null {
    const base = buildUpdatePatch();
    if (!base || !seed?.implementation || !seed.configContract || !seed.definitionName) {
      return null;
    }
    return {
      ...base,
      implementation: seed.implementation,
      implementationName: seed.implementationName,
      configContract: seed.configContract,
      definitionName: seed.definitionName,
    };
  }

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["indexers", "unified"] });
    if (indexerId != null) {
      await queryClient.invalidateQueries({ queryKey: ["indexer", instanceId, indexerId] });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async ({ forceSave }: { forceSave: boolean }) => {
      if (isCreate) {
        const body = buildCreatePatch();
        if (!body) throw new Error("Invalid indexer");
        return createIndexer(instanceId, body, forceSave);
      }
      const body = buildUpdatePatch();
      if (!body || indexerId == null) throw new Error("Invalid indexer");
      return updateIndexer(instanceId, indexerId, body, forceSave);
    },
    onSuccess: async () => {
      setSaveError(null);
      notifications.show({
        color: "green",
        message: isCreate ? "Indexer added" : "Indexer saved",
      });
      await invalidate();
      onClose();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Save failed";
      setSaveError(message);
      notifications.show({
        color: "red",
        title: isCreate ? "Add failed" : "Save failed",
        message,
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (isCreate) {
        const body = buildCreatePatch();
        if (!body) throw new Error("Invalid indexer");
        return testIndexerCreate(instanceId, body);
      }
      const body = buildUpdatePatch();
      if (!body || indexerId == null) throw new Error("Invalid indexer");
      return testIndexer(instanceId, indexerId, body);
    },
    onSuccess: () => {
      notifications.show({ color: "green", message: "Indexer test succeeded" });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Test failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIndexer(instanceId, indexerId!),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Indexer removed from Prowlarr" });
      await queryClient.invalidateQueries({ queryKey: ["indexers", "unified"] });
      onClose();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Delete failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const busy = saveMutation.isPending || deleteMutation.isPending || testMutation.isPending;
  const loading =
    optionsQuery.isLoading || (isCreate ? templateQuery.isLoading : detailQuery.isLoading);
  const loadError = isCreate ? templateQuery.error : detailQuery.error;
  const canSave = name.trim().length > 0 && appProfileId != null;

  const visibleFields = (seed?.fields ?? []).filter((field) =>
    isIndexerFieldVisible(field, fieldValues[field.name] ?? field.value, advanced),
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`${isCreate ? "Add" : "Edit"} Indexer - ${seed?.implementationName ?? title}`}
      size="lg"
      centered
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
    >
      {loading ? (
        <Group justify="center" py="xl">
          <Loader size="xl" />
        </Group>
      ) : null}

      {loadError ? (
        <Text c="red">
          {loadError instanceof Error ? loadError.message : "Failed to load indexer"}
        </Text>
      ) : null}

      {!loading && seed ? (
        <Stack gap="md">
          <TextInput
            label="Name"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            required
          />
          <Checkbox
            label="Enable"
            description={seed.supportsRss ? undefined : "This indexer does not support RSS."}
            checked={enable}
            onChange={(event) => setEnable(event.currentTarget.checked)}
          />
          <Checkbox
            label="Redirect"
            description="Redirect incoming download request for indexer and pass the grab directly instead of proxying the request via Prowlarr."
            checked={redirectLocked ? true : redirect}
            disabled={redirectDisabled}
            onChange={(event) => setRedirect(event.currentTarget.checked)}
          />
          <Select
            label="Sync Profile"
            description="App profiles are used to control RSS, Automatic Search and Interactive Search settings on application sync."
            data={profileOptions}
            value={appProfileId}
            onChange={setAppProfileId}
            allowDeselect={false}
            searchable
          />

          {visibleFields.map((field) => (
            <IndexerProviderField
              key={field.name}
              field={field}
              value={fieldValues[field.name]}
              onChange={(next) =>
                setFieldValues((current) => ({ ...current, [field.name]: next }))
              }
            />
          ))}

          {advanced ? (
            <>
              <NumberInput
                label="Priority"
                description="1 is highest, 50 is lowest."
                min={1}
                max={50}
                value={priority}
                onChange={setPriority}
              />
              {showDownloadClient ? (
                <Select
                  label="Download Client"
                  description="Use a specific download client for this indexer. Any uses the client selected by Prowlarr."
                  data={clientOptions}
                  value={downloadClientId}
                  onChange={(value) => setDownloadClientId(value ?? "0")}
                  allowDeselect={false}
                  searchable
                />
              ) : null}
            </>
          ) : null}

          <MultiSelect
            label="Tags"
            description="Use tags to specify Indexer Proxies or which apps the indexer is synced to."
            data={tagOptions}
            value={tagIds}
            onChange={setTagIds}
            searchable
            clearable
          />
          <Text size="xs" c="orange">
            Tags should be used with caution, they can have unintended effects. An indexer with a
            tag will only sync to apps with the same tag.
          </Text>

          {saveError ? (
            <Text size="sm" c="red">
              {saveError}
            </Text>
          ) : null}

          <Group justify="space-between" mt="md">
            {!isCreate ? (
              <Button
                color="red"
                variant="filled"
                loading={deleteMutation.isPending}
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Remove indexer "${seed.name}" from Prowlarr?`)) {
                    deleteMutation.mutate();
                  }
                }}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Group gap="sm">
              <Tooltip label={advanced ? "Hide advanced settings" : "Show advanced settings"}>
                <ActionIcon
                  variant={advanced ? "filled" : "default"}
                  size="lg"
                  aria-label="Advanced settings"
                  onClick={() => setAdvanced((current) => !current)}
                >
                  <GearSixIcon size={18} />
                </ActionIcon>
              </Tooltip>
              <Button
                variant="default"
                loading={testMutation.isPending}
                disabled={busy || !canSave}
                onClick={() => testMutation.mutate()}
              >
                Test
              </Button>
              <Button variant="default" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              {saveError ? (
                <Button
                  variant="default"
                  loading={saveMutation.isPending}
                  disabled={busy || !canSave}
                  onClick={() => saveMutation.mutate({ forceSave: true })}
                >
                  Save anyway
                </Button>
              ) : null}
              <Button
                loading={saveMutation.isPending}
                disabled={busy || !canSave}
                onClick={() => saveMutation.mutate({ forceSave: false })}
              >
                Save
              </Button>
            </Group>
          </Group>
        </Stack>
      ) : null}
    </Modal>
  );
}
