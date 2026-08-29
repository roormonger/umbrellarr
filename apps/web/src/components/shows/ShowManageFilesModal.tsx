import {
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  SeriesFileBulkUpdateItem,
  SeriesIndexerFlagOption,
  SeriesManageFile,
  SeriesQualityOption,
  SeriesReleaseLanguage,
  SeriesReleaseQuality,
} from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import {
  bulkDeleteSeriesFiles,
  bulkUpdateSeriesFiles,
  getSeriesIndexerFlags,
  getSeriesLanguages,
  getSeriesManageFiles,
  getSeriesQualities,
} from "@/api/shows";
import { formatFreeSpace } from "@/lib/moviePath";
import { CheckboxMultiSelect } from "../movies/CheckboxMultiSelect";
import { QualitySelectWithRevision } from "../movies/QualitySelectWithRevision";
import classes from "../movies/MovieManageFilesModal.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  instanceId: string;
  seriesId: number;
  title: string;
};

type FileDraft = {
  id: number;
  relativePath: string;
  size?: number;
  releaseGroup: string;
  qualityId: string | null;
  proper: boolean;
  real: boolean;
  languageIds: string[];
  flagIds: string[];
  customFormatScore?: number;
};

function flagsToIds(mask: number, options: SeriesIndexerFlagOption[]): string[] {
  return options.filter((f) => (mask & f.id) === f.id && f.id !== 0).map((f) => String(f.id));
}

function idsToFlags(ids: string[]): number {
  return ids.reduce((acc, id) => acc | Number(id), 0);
}

function toDraft(file: SeriesManageFile, flagOptions: SeriesIndexerFlagOption[]): FileDraft {
  return {
    id: file.id,
    relativePath: file.relativePath,
    size: file.size,
    releaseGroup: file.releaseGroup ?? "",
    qualityId: file.quality?.quality.id != null ? String(file.quality.quality.id) : null,
    proper: (file.quality?.revision.version ?? 1) > 1,
    real: (file.quality?.revision.real ?? 0) > 0,
    languageIds: file.languages.map((l) => String(l.id)),
    flagIds: flagsToIds(file.indexerFlags, flagOptions),
    customFormatScore: file.customFormatScore,
  };
}

function buildQuality(
  qualityId: string,
  qualities: SeriesQualityOption[],
  proper: boolean,
  real: boolean,
): SeriesReleaseQuality | null {
  const option = qualities.find((q) => String(q.id) === qualityId);
  if (!option) return null;
  return {
    quality: {
      id: option.id,
      name: option.name,
      source: option.source,
      resolution: option.resolution,
      modifier: option.modifier,
    },
    revision: {
      version: proper ? 2 : 1,
      real: real ? 1 : 0,
      isRepack: false,
    },
  };
}

function formatScore(score?: number): string {
  if (score == null) return "—";
  return score > 0 ? `+${score}` : String(score);
}

export function ShowManageFilesModal({
  opened,
  onClose,
  instanceId,
  seriesId,
  title,
}: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [drafts, setDrafts] = useState<Record<number, FileDraft>>({});

  const filesQuery = useQuery({
    queryKey: ["series-manage-files", instanceId, seriesId],
    queryFn: () => getSeriesManageFiles(instanceId, seriesId),
    enabled: opened,
  });

  const qualitiesQuery = useQuery({
    queryKey: ["series-qualities", instanceId],
    queryFn: () => getSeriesQualities(instanceId),
    enabled: opened,
    staleTime: 5 * 60_000,
  });

  const languagesQuery = useQuery({
    queryKey: ["series-languages", instanceId],
    queryFn: () => getSeriesLanguages(instanceId),
    enabled: opened,
    staleTime: 5 * 60_000,
  });

  const flagsQuery = useQuery({
    queryKey: ["series-indexer-flags", instanceId],
    queryFn: () => getSeriesIndexerFlags(instanceId),
    enabled: opened,
    staleTime: 5 * 60_000,
  });

  const loading =
    filesQuery.isLoading ||
    qualitiesQuery.isLoading ||
    languagesQuery.isLoading ||
    flagsQuery.isLoading;

  const error =
    filesQuery.error ?? qualitiesQuery.error ?? languagesQuery.error ?? flagsQuery.error;

  const qualities = qualitiesQuery.data?.qualities ?? [];
  const languages = languagesQuery.data?.languages ?? [];
  const flagOptions = flagsQuery.data?.flags ?? [];

  useEffect(() => {
    if (!opened || !filesQuery.data) return;
    const flags = flagsQuery.data?.flags ?? [];
    const nextDrafts: Record<number, FileDraft> = {};
    const nextSelected: Record<number, boolean> = {};
    for (const file of filesQuery.data.files) {
      nextDrafts[file.id] = toDraft(file, flags);
      nextSelected[file.id] = true;
    }
    setDrafts(nextDrafts);
    setSelected(nextSelected);
  }, [opened, filesQuery.data, flagsQuery.data?.flags]);

  const draftList = useMemo(() => Object.values(drafts), [drafts]);

  const selectedIds = useMemo(
    () => draftList.filter((d) => selected[d.id]).map((d) => d.id),
    [draftList, selected],
  );

  const allSelected = draftList.length > 0 && selectedIds.length === draftList.length;
  const noneSelected = selectedIds.length === 0;

  const qualityOptions = useMemo(
    () => qualities.map((q) => ({ value: String(q.id), label: q.name })),
    [qualities],
  );

  const languageOptions = useMemo(
    () => languages.map((l) => ({ value: String(l.id), label: l.name })),
    [languages],
  );

  const flagSelectOptions = useMemo(
    () => flagOptions.map((f) => ({ value: String(f.id), label: f.name })),
    [flagOptions],
  );

  function updateDraft(id: number, patch: Partial<FileDraft>) {
    setDrafts((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, ...patch } };
    });
  }

  function buildUpdatePayload(): SeriesFileBulkUpdateItem[] | null {
    const items: SeriesFileBulkUpdateItem[] = [];
    for (const id of selectedIds) {
      const draft = drafts[id];
      if (!draft?.qualityId || draft.languageIds.length === 0) return null;
      const quality = buildQuality(draft.qualityId, qualities, draft.proper, draft.real);
      if (!quality) return null;
      const langs: SeriesReleaseLanguage[] = draft.languageIds
        .map((langId) => {
          const lang = languages.find((l) => String(l.id) === langId);
          return lang ? { id: lang.id, name: lang.name } : null;
        })
        .filter((l): l is SeriesReleaseLanguage => l != null);
      if (langs.length === 0) return null;
      items.push({
        id: draft.id,
        quality,
        languages: langs,
        releaseGroup: draft.releaseGroup,
        indexerFlags: idsToFlags(draft.flagIds),
      });
    }
    return items;
  }

  const importValid = useMemo(() => {
    if (noneSelected) return false;
    return selectedIds.every((id) => {
      const d = drafts[id];
      return Boolean(d?.qualityId && d.languageIds.length > 0);
    });
  }, [drafts, noneSelected, selectedIds]);

  const importMutation = useMutation({
    mutationFn: () => {
      const payload = buildUpdatePayload();
      if (!payload) throw new Error("Selected files need a quality and at least one language");
      return bulkUpdateSeriesFiles(instanceId, payload);
    },
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Episode files updated in Sonarr" });
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["series", instanceId, seriesId] });
      await queryClient.invalidateQueries({
        queryKey: ["series-manage-files", instanceId, seriesId],
      });
    },
    onError: (err) => {
      notifications.show({
        color: "red",
        title: "Import failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => bulkDeleteSeriesFiles(instanceId, selectedIds),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Episode files deleted in Sonarr" });
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["series", instanceId, seriesId] });
      await queryClient.invalidateQueries({
        queryKey: ["series-manage-files", instanceId, seriesId],
      });
      await queryClient.invalidateQueries({ queryKey: ["shows"] });
    },
    onError: (err) => {
      notifications.show({
        color: "red",
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const busy = importMutation.isPending || deleteMutation.isPending;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Manage Files - ${title}`}
      size="95%"
      centered
      styles={{ content: { maxWidth: 1200 } }}
    >
      {loading && (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      )}

      {error && (
        <Text c="red" size="sm">
          {error instanceof Error ? error.message : "Failed to load files"}
        </Text>
      )}

      {!loading && !error && draftList.length === 0 && (
        <Text c="dimmed" size="sm" ta="center" py="xl">
          No episode files to manage.
        </Text>
      )}

      {!loading && !error && draftList.length > 0 && (
        <div className={classes.tableWrap}>
          <ScrollArea.Autosize mah="60vh" type="auto" offsetScrollbars>
            <Table striped highlightOnHover horizontalSpacing="sm" verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={40}>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={!allSelected && !noneSelected}
                      aria-label="Select all files"
                      onChange={(e) => {
                        const checked = e.currentTarget.checked;
                        const next: Record<number, boolean> = {};
                        for (const d of draftList) next[d.id] = checked;
                        setSelected(next);
                      }}
                    />
                  </Table.Th>
                  <Table.Th>Relative Path</Table.Th>
                  <Table.Th w={140}>Release Group</Table.Th>
                  <Table.Th w={200}>Quality</Table.Th>
                  <Table.Th w={180}>Languages</Table.Th>
                  <Table.Th w={160}>Indexer Flags</Table.Th>
                  <Table.Th w={80}>Size</Table.Th>
                  <Table.Th w={56} ta="center">
                    Score
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {draftList.map((draft) => (
                  <Table.Tr key={draft.id}>
                    <Table.Td>
                      <Checkbox
                        checked={Boolean(selected[draft.id])}
                        aria-label={`Select ${draft.relativePath}`}
                        onChange={(e) =>
                          setSelected((prev) => ({
                            ...prev,
                            [draft.id]: e.currentTarget.checked,
                          }))
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" className={classes.path}>
                        {draft.relativePath}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        size="xs"
                        value={draft.releaseGroup}
                        placeholder="Release group"
                        styles={{
                          input: {
                            minHeight: "var(--input-height-xs)",
                            height: "var(--input-height-xs)",
                          },
                        }}
                        onChange={(e) =>
                          updateDraft(draft.id, { releaseGroup: e.currentTarget.value })
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <QualitySelectWithRevision
                        options={qualityOptions}
                        value={draft.qualityId}
                        proper={draft.proper}
                        real={draft.real}
                        onQualityChange={(value) => updateDraft(draft.id, { qualityId: value })}
                        onProperChange={(value) => updateDraft(draft.id, { proper: value })}
                        onRealChange={(value) => updateDraft(draft.id, { real: value })}
                      />
                    </Table.Td>
                    <Table.Td>
                      <CheckboxMultiSelect
                        options={languageOptions}
                        value={draft.languageIds}
                        placeholder="Languages"
                        multiLabel="Multi-Language"
                        searchPlaceholder="Search languages"
                        onChange={(value) => updateDraft(draft.id, { languageIds: value })}
                      />
                    </Table.Td>
                    <Table.Td>
                      <CheckboxMultiSelect
                        options={flagSelectOptions}
                        value={draft.flagIds}
                        placeholder="Flags"
                        multiLabel="Multiple flags"
                        searchPlaceholder="Search flags"
                        onChange={(value) => updateDraft(draft.id, { flagIds: value })}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                        {draft.size != null ? formatFreeSpace(draft.size) : "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Text size="sm">{formatScore(draft.customFormatScore)}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        </div>
      )}

      <Group justify="space-between" mt="lg">
        <Button
          color="red"
          disabled={noneSelected || busy}
          loading={deleteMutation.isPending}
          onClick={() => {
            if (
              window.confirm(
                `Delete ${selectedIds.length} selected episode file${selectedIds.length === 1 ? "" : "s"} from disk and Sonarr?`,
              )
            ) {
              deleteMutation.mutate();
            }
          }}
        >
          Delete
        </Button>
        <Group gap="sm">
          <Button variant="default" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            color="teal"
            disabled={!importValid || busy}
            loading={importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            Import
          </Button>
        </Group>
      </Group>
    </Modal>
  );
}
