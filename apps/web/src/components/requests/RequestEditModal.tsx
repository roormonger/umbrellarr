import {
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MediaRequestItem, RequestUpdateBody } from "@umbrellarr/shared";
import { useEffect, useMemo, useState } from "react";
import {
  getRequestDetail,
  getRequestServiceDetail,
  listRequestServices,
  listRequestUsers,
  updateRequest,
} from "@/api/requests";
import { APP_LOADER_SIZE } from "@/components/QuantumLoader";
import { formatFreeSpace } from "@/lib/moviePath";
import classes from "./RequestEditModal.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  instanceId: string;
  request: MediaRequestItem | null;
};

export function RequestEditModal({ opened, onClose, instanceId, request }: Props) {
  const queryClient = useQueryClient();
  const requestId = request?.id;

  const detailQuery = useQuery({
    queryKey: ["request-detail", instanceId, requestId],
    queryFn: () => getRequestDetail(instanceId, requestId!),
    enabled: opened && requestId != null,
  });

  const detail = detailQuery.data ?? request;
  const mediaType = detail?.mediaType ?? "movie";

  const servicesQuery = useQuery({
    queryKey: ["request-services", instanceId, mediaType],
    queryFn: () => listRequestServices(instanceId, mediaType),
    enabled: opened && detail != null,
  });

  const usersQuery = useQuery({
    queryKey: ["request-users", instanceId],
    queryFn: () => listRequestUsers(instanceId),
    enabled: opened,
  });

  const [serverId, setServerId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [rootFolder, setRootFolder] = useState<string | null>(null);
  const [languageProfileId, setLanguageProfileId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(new Set());

  const serviceDetailQuery = useQuery({
    queryKey: ["request-service-detail", instanceId, mediaType, serverId],
    queryFn: () => getRequestServiceDetail(instanceId, mediaType, Number(serverId)),
    enabled: opened && serverId != null,
  });

  useEffect(() => {
    if (!opened || !detail) return;
    setServerId(detail.serverId != null ? String(detail.serverId) : null);
    setProfileId(detail.profileId != null ? String(detail.profileId) : null);
    setRootFolder(detail.rootFolder ?? null);
    setLanguageProfileId(
      detail.languageProfileId != null ? String(detail.languageProfileId) : null,
    );
    setTagIds(detail.tags.map(String));
    setUserId(detail.requestedBy ? String(detail.requestedBy.id) : null);
    setSelectedSeasons(new Set(detail.seasons.map((s) => s.seasonNumber)));
  }, [opened, detail?.id]);

  useEffect(() => {
    if (!opened || serverId != null || !servicesQuery.data?.servers.length) return;
    const servers = servicesQuery.data.servers.filter((s) => !detail?.is4k || s.is4k);
    const preferred =
      servers.find((s) => s.id === detail?.serverId) ??
      servers.find((s) => s.isDefault) ??
      servers[0];
    if (preferred) setServerId(String(preferred.id));
  }, [opened, serverId, servicesQuery.data, detail?.serverId, detail?.is4k]);

  useEffect(() => {
    const service = serviceDetailQuery.data;
    if (!service) return;
    if (profileId == null) {
      const next =
        detail?.profileId ??
        service.server.activeProfileId ??
        service.profiles[0]?.id;
      if (next != null) setProfileId(String(next));
    }
    if (rootFolder == null) {
      const next =
        detail?.rootFolder ??
        service.server.activeDirectory ??
        service.rootFolders[0]?.path;
      if (next) setRootFolder(next);
    }
    if (languageProfileId == null && service.languageProfiles?.length) {
      const next =
        detail?.languageProfileId ??
        service.server.activeLanguageProfileId ??
        service.languageProfiles[0]?.id;
      if (next != null) setLanguageProfileId(String(next));
    }
    if (tagIds.length === 0 && (service.server.activeTags?.length ?? 0) > 0) {
      setTagIds((service.server.activeTags ?? []).map(String));
    }
  }, [serviceDetailQuery.data]);

  const seasonOptions = detailQuery.data?.seasonOptions ?? detail?.seasons ?? [];
  const allSeasonNumbers = seasonOptions.map((s) => s.seasonNumber);
  const allSelected =
    allSeasonNumbers.length > 0 && allSeasonNumbers.every((n) => selectedSeasons.has(n));

  const serverOptions = useMemo(
    () =>
      (servicesQuery.data?.servers ?? [])
        .filter((s) => !detail?.is4k || Boolean(s.is4k) === Boolean(detail.is4k))
        .map((s) => ({
          value: String(s.id),
          label: s.isDefault ? `${s.name} (Default)` : s.name,
        })),
    [servicesQuery.data, detail?.is4k],
  );

  const profileOptions = (serviceDetailQuery.data?.profiles ?? []).map((p) => ({
    value: String(p.id),
    label: p.name,
  }));

  const folderOptions = (serviceDetailQuery.data?.rootFolders ?? []).map((f) => {
    const free =
      f.freeSpace != null && f.freeSpace > 0 ? ` (${formatFreeSpace(f.freeSpace)})` : "";
    return { value: f.path, label: `${f.path}${free}` };
  });

  const tagOptions = (serviceDetailQuery.data?.tags ?? []).map((t) => ({
    value: String(t.id),
    label: t.label,
  }));

  const languageOptions = (serviceDetailQuery.data?.languageProfiles ?? []).map((p) => ({
    value: String(p.id),
    label: p.name,
  }));

  const userOptions = (usersQuery.data?.users ?? []).map((u) => ({
    value: String(u.id),
    label: u.email ? `${u.displayName} (${u.email})` : u.displayName,
  }));

  const saveMutation = useMutation({
    mutationFn: (approve: boolean) => {
      if (
        serverId == null ||
        profileId == null ||
        !rootFolder ||
        userId == null ||
        !detail
      ) {
        throw new Error("Fill destination server, profile, root folder, and user");
      }
      if (mediaType === "tv" && selectedSeasons.size === 0) {
        throw new Error("Select at least one season");
      }
      const body: RequestUpdateBody = {
        mediaType,
        serverId: Number(serverId),
        profileId: Number(profileId),
        rootFolder,
        userId: Number(userId),
        tags: tagIds.map(Number),
        approve,
      };
      if (mediaType === "tv") {
        body.seasons = [...selectedSeasons].sort((a, b) => a - b);
        if (languageProfileId != null) {
          body.languageProfileId = Number(languageProfileId);
        }
      }
      return updateRequest(instanceId, detail.id, body);
    },
    onSuccess: async (_data, approve) => {
      notifications.show({
        color: "green",
        message: approve ? "Request approved" : "Request updated",
      });
      await queryClient.invalidateQueries({ queryKey: ["requests", instanceId] });
      onClose();
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Update failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  function toggleSeason(seasonNumber: number, checked: boolean) {
    setSelectedSeasons((current) => {
      const next = new Set(current);
      if (checked) next.add(seasonNumber);
      else next.delete(seasonNumber);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedSeasons(checked ? new Set(allSeasonNumbers) : new Set());
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Pending Request"
      size="lg"
      centered
    >
      {!detail || detailQuery.isLoading ? (
        <Group justify="center" py="xl">
          <Loader size={APP_LOADER_SIZE} />
        </Group>
      ) : (
        <Stack gap="md">
          <div className={classes.header}>
            <Text fw={700} size="lg">
              {detail.title}
            </Text>
            <Text size="sm" c="dimmed">
              {detail.requestedBy
                ? `${detail.requestedBy.displayName}'s request is pending approval.`
                : "This request is pending approval."}
            </Text>
          </div>

          {mediaType === "tv" && seasonOptions.length > 0 ? (
            <div className={classes.seasonTable}>
              <div className={classes.seasonHead}>
                <Switch
                  size="sm"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.currentTarget.checked)}
                  aria-label="Toggle all seasons"
                />
                <span>Season</span>
                <span># of Episodes</span>
                <span>Status</span>
              </div>
              {seasonOptions.map((season) => (
                <div key={season.seasonNumber} className={classes.seasonRow}>
                  <Switch
                    size="sm"
                    checked={selectedSeasons.has(season.seasonNumber)}
                    onChange={(e) =>
                      toggleSeason(season.seasonNumber, e.currentTarget.checked)
                    }
                    aria-label={`Season ${season.seasonNumber}`}
                  />
                  <Text size="sm">
                    {season.seasonNumber === 0
                      ? "Specials"
                      : `Season ${season.seasonNumber}`}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {season.episodeCount ?? "—"}
                  </Text>
                  <Badge size="sm" color="yellow" variant="light" w="fit-content">
                    {season.status.charAt(0).toUpperCase() + season.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : null}

          <Text fw={600} size="sm">
            Advanced
          </Text>
          <Group grow align="flex-start">
            <Select
              label="Destination Server"
              data={serverOptions}
              value={serverId}
              onChange={(value) => {
                setServerId(value);
                setProfileId(null);
                setRootFolder(null);
                setLanguageProfileId(null);
              }}
              allowDeselect={false}
            />
            <Select
              label="Quality Profile"
              data={profileOptions}
              value={profileId}
              onChange={setProfileId}
              allowDeselect={false}
              disabled={!serverId || serviceDetailQuery.isLoading}
            />
            <Select
              label="Root Folder"
              data={folderOptions}
              value={rootFolder}
              onChange={setRootFolder}
              allowDeselect={false}
              disabled={!serverId || serviceDetailQuery.isLoading}
            />
          </Group>
          {languageOptions.length > 0 ? (
            <Select
              label="Language Profile"
              data={languageOptions}
              value={languageProfileId}
              onChange={setLanguageProfileId}
              allowDeselect={false}
            />
          ) : null}
          <MultiSelect
            label="Tags"
            data={tagOptions}
            value={tagIds}
            onChange={setTagIds}
            searchable
            clearable
            disabled={!serverId || serviceDetailQuery.isLoading}
          />
          <Select
            label="Request As"
            data={userOptions}
            value={userId}
            onChange={setUserId}
            allowDeselect={false}
            searchable
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Close
            </Button>
            <Button
              color="teal"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate(true)}
            >
              Approve Request
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
