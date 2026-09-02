import { Button, Group, Select, Text } from "@mantine/core";
import {
  MOVIE_MINIMUM_AVAILABILITY_OPTIONS,
  type CollectionBulkUpdateRequest,
  type CollectionEditOptions,
  type MovieMinimumAvailability,
} from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import { rootFolderLabel } from "@/lib/moviePath";
import classes from "./CollectionsBulkBar.module.css";

const NO_CHANGE = "__nochange__";

const BOOL_OPTIONS = [
  { value: NO_CHANGE, label: "No Change" },
  { value: "true", label: "Monitor" },
  { value: "false", label: "Unmonitor" },
];

const SEARCH_OPTIONS = [
  { value: NO_CHANGE, label: "No Change" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

function parseBool(value: string | null): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function CollectionsBulkBar({
  selectedCount,
  options,
  updating,
  onUpdate,
}: {
  selectedCount: number;
  options?: CollectionEditOptions;
  updating?: boolean;
  onUpdate: (patch: Omit<CollectionBulkUpdateRequest, "collectionIds">) => void;
}) {
  const [monitored, setMonitored] = useState<string | null>(NO_CHANGE);
  const [monitorMovies, setMonitorMovies] = useState<string | null>(NO_CHANGE);
  const [qualityProfileId, setQualityProfileId] = useState<string | null>(NO_CHANGE);
  const [minimumAvailability, setMinimumAvailability] = useState<string | null>(NO_CHANGE);
  const [rootFolderPath, setRootFolderPath] = useState<string | null>(NO_CHANGE);
  const [searchOnAdd, setSearchOnAdd] = useState<string | null>(NO_CHANGE);

  const enabled = selectedCount > 0;

  useEffect(() => {
    if (selectedCount === 0) {
      setMonitored(NO_CHANGE);
      setMonitorMovies(NO_CHANGE);
      setQualityProfileId(NO_CHANGE);
      setMinimumAvailability(NO_CHANGE);
      setRootFolderPath(NO_CHANGE);
      setSearchOnAdd(NO_CHANGE);
    }
  }, [selectedCount]);

  const profileData = useMemo(
    () => [
      { value: NO_CHANGE, label: "No Change" },
      ...(options?.qualityProfiles ?? []).map((p) => ({
        value: String(p.id),
        label: p.name,
      })),
    ],
    [options?.qualityProfiles],
  );

  const availabilityData = useMemo(
    () => [
      { value: NO_CHANGE, label: "No Change" },
      ...MOVIE_MINIMUM_AVAILABILITY_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
      })),
    ],
    [],
  );

  const rootData = useMemo(
    () => [
      { value: NO_CHANGE, label: "No Change" },
      ...(options?.rootFolders ?? []).map((r) => ({
        value: r.path,
        label: rootFolderLabel(r.path, r.freeSpace),
      })),
    ],
    [options?.rootFolders],
  );

  function submit() {
    const profileNum =
      qualityProfileId && qualityProfileId !== NO_CHANGE ? Number(qualityProfileId) : null;
    const availability =
      minimumAvailability && minimumAvailability !== NO_CHANGE
        ? (minimumAvailability as MovieMinimumAvailability)
        : null;
    onUpdate({
      monitored: parseBool(monitored),
      monitorMovies: parseBool(monitorMovies),
      searchOnAdd: parseBool(searchOnAdd),
      qualityProfileId: Number.isFinite(profileNum) ? profileNum : null,
      rootFolderPath: rootFolderPath && rootFolderPath !== NO_CHANGE ? rootFolderPath : null,
      minimumAvailability: availability,
    });
  }

  return (
    <div className={classes.bar}>
      <Text size="sm" c={enabled ? undefined : "dimmed"} className={classes.count}>
        {selectedCount === 0
          ? "Select collections to update"
          : `${selectedCount} collection${selectedCount === 1 ? "" : "s"} selected`}
      </Text>
      <Group gap="sm" wrap="wrap" align="flex-end" className={classes.controls}>
        <Select
          size="xs"
          label="Monitor Collection"
          data={BOOL_OPTIONS}
          value={monitored}
          onChange={setMonitored}
          disabled={!enabled}
          allowDeselect={false}
          comboboxProps={{ position: "top" }}
          w={150}
        />
        <Select
          size="xs"
          label="Monitor Movies"
          data={BOOL_OPTIONS}
          value={monitorMovies}
          onChange={setMonitorMovies}
          disabled={!enabled}
          allowDeselect={false}
          comboboxProps={{ position: "top" }}
          w={150}
        />
        <Select
          size="xs"
          label="Quality Profile"
          data={profileData}
          value={qualityProfileId}
          onChange={setQualityProfileId}
          disabled={!enabled}
          allowDeselect={false}
          comboboxProps={{ position: "top" }}
          w={170}
        />
        <Select
          size="xs"
          label="Minimum Availability"
          data={availabilityData}
          value={minimumAvailability}
          onChange={setMinimumAvailability}
          disabled={!enabled}
          allowDeselect={false}
          comboboxProps={{ position: "top" }}
          w={170}
        />
        <Select
          size="xs"
          label="Root Folder"
          data={rootData}
          value={rootFolderPath}
          onChange={setRootFolderPath}
          disabled={!enabled}
          allowDeselect={false}
          comboboxProps={{ position: "top" }}
          w={220}
        />
        <Select
          size="xs"
          label="Search Movies on Add"
          data={SEARCH_OPTIONS}
          value={searchOnAdd}
          onChange={setSearchOnAdd}
          disabled={!enabled}
          allowDeselect={false}
          comboboxProps={{ position: "top" }}
          w={170}
        />
        <Button size="sm" disabled={!enabled} loading={updating} onClick={submit}>
          Update Selected
        </Button>
      </Group>
    </div>
  );
}
