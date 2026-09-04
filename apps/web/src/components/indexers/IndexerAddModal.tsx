import {
  Badge,
  Group,
  Loader,
  Modal,
  MultiSelect,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { useQuery } from "@tanstack/react-query";
import {
  INDEXER_PRIVACY_FILTER_OPTIONS,
  INDEXER_PROTOCOL_FILTER_OPTIONS,
  type IndexerPrivacy,
  type IndexerProtocol,
  type IndexerSchemaItem,
} from "@umbrellarr/shared";
import { useMemo, useState } from "react";
import { listIndexerCategories, listIndexerSchema } from "@/api/indexers";
import { privacyLabel, protocolLabel } from "@/lib/indexerDisplay";

type InstanceOption = { value: string; label: string };

type Props = {
  opened: boolean;
  instanceId: string;
  instanceOptions?: InstanceOption[];
  onClose: () => void;
  onSelect: (item: IndexerSchemaItem, instanceId: string) => void;
  onInstanceChange?: (instanceId: string) => void;
};

export function IndexerAddModal({
  opened,
  instanceId,
  instanceOptions,
  onClose,
  onSelect,
  onInstanceChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [protocol, setProtocol] = useState<IndexerProtocol | "all">("all");
  const [privacy, setPrivacy] = useState<IndexerPrivacy | "all">("all");
  const [language, setLanguage] = useState<string | null>("all");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const schemaQuery = useQuery({
    queryKey: ["indexer-schema", instanceId],
    queryFn: () => listIndexerSchema(instanceId),
    enabled: opened && Boolean(instanceId),
    staleTime: 5 * 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["indexer-categories", instanceId],
    queryFn: () => listIndexerCategories(instanceId),
    enabled: opened && Boolean(instanceId),
    staleTime: 5 * 60_000,
  });

  const instanceLabel = instanceOptions?.find((option) => option.value === instanceId)?.label;

  const languageOptions = useMemo(() => {
    const languages = new Set<string>();
    for (const item of schemaQuery.data?.items ?? []) {
      const lang = item.language.trim();
      if (lang) languages.add(lang);
    }
    return [
      { value: "all", label: "All languages" },
      ...[...languages]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
        .map((value) => ({ value, label: value })),
    ];
  }, [schemaQuery.data?.items]);

  const categoryOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    for (const cat of categoriesQuery.data?.categories ?? []) {
      options.push({ value: String(cat.id), label: cat.name });
      for (const sub of cat.subCategories) {
        options.push({ value: String(sub.id), label: `${cat.name} / ${sub.name}` });
      }
    }
    return options;
  }, [categoriesQuery.data?.categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const selectedCats = new Set(categoryIds.map(Number).filter(Number.isFinite));
    return (schemaQuery.data?.items ?? []).filter((item) => {
      if (protocol !== "all" && item.protocol !== protocol) return false;
      if (privacy !== "all" && item.privacy !== privacy) return false;
      if (language && language !== "all" && item.language !== language) return false;
      if (selectedCats.size > 0) {
        const hit = item.categoryIds.some((id) => selectedCats.has(id));
        if (!hit) return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.implementationName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.language.toLowerCase().includes(q)
      );
    });
  }, [schemaQuery.data?.items, search, protocol, privacy, language, categoryIds]);

  const loading = schemaQuery.isLoading || categoriesQuery.isLoading;
  const total = schemaQuery.data?.items.length ?? 0;
  const shown = filtered.length;

  function resetFilters() {
    setSearch("");
    setProtocol("all");
    setPrivacy("all");
    setLanguage("all");
    setCategoryIds([]);
  }

  return (
    <Modal
      opened={opened}
      onClose={() => {
        resetFilters();
        onClose();
      }}
      title={instanceLabel ? `Add Indexer — ${instanceLabel}` : "Add Indexer"}
      size="xl"
      centered
      styles={{ body: { display: "flex", flexDirection: "column", gap: 12, maxHeight: "75vh" } }}
    >
      <Stack gap="sm">
        {instanceOptions && instanceOptions.length > 1 && onInstanceChange ? (
          <Select
            label="Prowlarr instance"
            data={instanceOptions}
            value={instanceId}
            onChange={(value) => {
              if (value) {
                setCategoryIds([]);
                onInstanceChange(value);
              }
            }}
            allowDeselect={false}
          />
        ) : null}
        <TextInput
          placeholder="Search indexers…"
          leftSection={<MagnifyingGlassIcon size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
        <Group grow align="flex-start" gap="sm">
          <Select
            label="Protocol"
            data={INDEXER_PROTOCOL_FILTER_OPTIONS}
            value={protocol}
            onChange={(value) => setProtocol((value as IndexerProtocol | "all") ?? "all")}
            allowDeselect={false}
          />
          <Select
            label="Privacy"
            data={INDEXER_PRIVACY_FILTER_OPTIONS}
            value={privacy}
            onChange={(value) => setPrivacy((value as IndexerPrivacy | "all") ?? "all")}
            allowDeselect={false}
          />
          <Select
            label="Language"
            data={languageOptions}
            value={language}
            onChange={setLanguage}
            allowDeselect={false}
            searchable
          />
        </Group>
        <MultiSelect
          label="Categories"
          placeholder="All categories"
          data={categoryOptions}
          value={categoryIds}
          onChange={setCategoryIds}
          searchable
          clearable
          maxDropdownHeight={280}
        />
      </Stack>

      {loading ? (
        <Group justify="center" py="xl">
          <Loader size="xl" />
        </Group>
      ) : null}

      {schemaQuery.error ? (
        <Text c="red">
          {schemaQuery.error instanceof Error
            ? schemaQuery.error.message
            : "Failed to load indexer catalog"}
        </Text>
      ) : null}

      {!loading && !schemaQuery.error ? (
        <>
          <ScrollArea h={360} offsetScrollbars type="auto">
            <Table highlightOnHover stickyHeader horizontalSpacing="sm" verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Protocol</Table.Th>
                  <Table.Th>Privacy</Table.Th>
                  <Table.Th>Language</Table.Th>
                  <Table.Th>Categories</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" size="sm" ta="center" py="xl">
                        No indexers match these filters.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filtered.map((item) => (
                    <Table.Tr
                      key={item.key}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        resetFilters();
                        onSelect(item, instanceId);
                      }}
                    >
                      <Table.Td>
                        <Text size="sm" fw={500} lineClamp={1}>
                          {item.name}
                        </Text>
                        {item.description ? (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {item.description}
                          </Text>
                        ) : null}
                      </Table.Td>
                      <Table.Td>
                        <Badge size="xs" variant="light">
                          {protocolLabel(item.protocol)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="xs"
                          variant="light"
                          color={
                            item.privacy === "private"
                              ? "orange"
                              : item.privacy === "semiPrivate"
                                ? "yellow"
                                : "gray"
                          }
                        >
                          {privacyLabel(item.privacy)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{item.language || "—"}</Text>
                      </Table.Td>
                      <Table.Td>
                        {item.categories.length > 0 ? (
                          <Group gap={4} wrap="nowrap">
                            {item.categories.slice(0, 3).map((category) => (
                              <Badge key={category} size="xs" variant="light">
                                {category}
                              </Badge>
                            ))}
                            {item.categories.length > 3 ? (
                              <Text size="xs" c="dimmed">
                                +{item.categories.length - 3}
                              </Text>
                            ) : null}
                          </Group>
                        ) : (
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          <Text size="sm" c="dimmed">
            Showing {shown.toLocaleString()} of {total.toLocaleString()} indexers
          </Text>
        </>
      ) : null}
    </Modal>
  );
}
