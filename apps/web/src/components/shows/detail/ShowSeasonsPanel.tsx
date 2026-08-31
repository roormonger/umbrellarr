import { Group, Loader, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SeriesEpisode, SeriesSeasonSummary, SeriesType } from "@umbrellarr/shared";
import { useMemo, useState } from "react";
import {
  getSeriesEpisodes,
  getSeriesSeasons,
  searchEpisode,
  searchSeason,
  setSeasonMonitored,
} from "@/api/shows";
import { ShowHistoryModal } from "@/components/shows/ShowHistoryModal";
import { ShowInteractiveSearchModal } from "@/components/shows/ShowInteractiveSearchModal";
import { ShowManageFilesModal } from "@/components/shows/ShowManageFilesModal";
import { ShowOrganizeModal } from "@/components/shows/ShowOrganizeModal";
import { ShowEpisodeTable } from "./ShowEpisodeTable";
import { ShowSeasonHeader } from "./ShowSeasonHeader";
import { seasonLabel } from "./showSeasonLabel";
import classes from "./ShowSeasonsPanel.module.css";

type Props = {
  instanceId: string;
  seriesId: number;
  title: string;
  year?: number;
  seriesPath: string;
  seriesType: SeriesType;
};

type InteractiveTarget = {
  seasonNumber?: number;
  episodeId?: number;
  episodeNumber?: number;
  episodeTitle?: string;
};

type SeasonModal = "history" | "organize" | "manage";

type SeasonsResponse = { seasons: SeriesSeasonSummary[] };

export function ShowSeasonsPanel({
  instanceId,
  seriesId,
  title,
  year,
  seriesPath,
  seriesType,
}: Props) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [interactive, setInteractive] = useState<InteractiveTarget | null>(null);
  const [seasonModal, setSeasonModal] = useState<{
    kind: SeasonModal;
    seasonNumber: number;
  } | null>(null);

  const seasonsQuery = useQuery({
    queryKey: ["series-seasons", instanceId, seriesId],
    queryFn: () => getSeriesSeasons(instanceId, seriesId),
    refetchInterval: 10_000,
    refetchOnWindowFocus: "always",
  });

  const episodesQuery = useQuery({
    queryKey: ["series-episodes", instanceId, seriesId],
    queryFn: () => getSeriesEpisodes(instanceId, seriesId),
    // Keep queue/downloading status current while the show page is open.
    refetchInterval: 5_000,
    refetchOnWindowFocus: "always",
  });

  const episodesBySeason = useMemo(() => {
    const map = new Map<number, SeriesEpisode[]>();
    for (const episode of episodesQuery.data?.episodes ?? []) {
      const list = map.get(episode.seasonNumber) ?? [];
      list.push(episode);
      map.set(episode.seasonNumber, list);
    }
    return map;
  }, [episodesQuery.data?.episodes]);

  const monitorMutation = useMutation({
    mutationFn: ({ seasonNumber, monitored }: { seasonNumber: number; monitored: boolean }) =>
      setSeasonMonitored(instanceId, seriesId, seasonNumber, monitored),
    onMutate: async ({ seasonNumber, monitored }) => {
      const key = ["series-seasons", instanceId, seriesId] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SeasonsResponse>(key);
      queryClient.setQueryData<SeasonsResponse>(key, (current) => {
        if (!current) return current;
        return {
          seasons: current.seasons.map((season) =>
            season.seasonNumber === seasonNumber ? { ...season, monitored } : season,
          ),
        };
      });
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData<SeasonsResponse>(
          ["series-seasons", instanceId, seriesId],
          context.previous,
        );
      }
      notifications.show({
        color: "red",
        title: "Monitor failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["series-seasons", instanceId, seriesId], data);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["series", instanceId, seriesId] });
      await queryClient.invalidateQueries({ queryKey: ["shows"] });
    },
  });

  const seasonSearchMutation = useMutation({
    mutationFn: (seasonNumber: number) => searchSeason(instanceId, seriesId, seasonNumber),
    onSuccess: (_data, seasonNumber) => {
      notifications.show({
        color: "blue",
        message: `Searching ${seasonLabel(seasonNumber)} in Sonarr`,
      });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const episodeSearchMutation = useMutation({
    mutationFn: (episode: SeriesEpisode) => searchEpisode(instanceId, seriesId, episode.id),
    onSuccess: (_data, episode) => {
      notifications.show({
        color: "blue",
        message: `Searching ${seasonLabel(episode.seasonNumber)} episode ${episode.episodeNumber} in Sonarr`,
      });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  function toggleExpand(seasonNumber: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(seasonNumber)) next.delete(seasonNumber);
      else next.add(seasonNumber);
      return next;
    });
  }

  const seasons = seasonsQuery.data?.seasons ?? [];

  return (
    <>
      <section className={classes.panel} aria-label="Seasons">
        {seasonsQuery.isLoading && (
          <Group justify="center" py="md">
            <Loader size="xl" />
          </Group>
        )}
        {seasonsQuery.error && (
          <Text c="red" size="sm">
            {seasonsQuery.error instanceof Error
              ? seasonsQuery.error.message
              : "Failed to load seasons"}
          </Text>
        )}
        {seasonsQuery.isSuccess && seasons.length === 0 && (
          <Text c="dimmed" size="sm">
            No seasons reported by Sonarr.
          </Text>
        )}
        {seasons.map((season) => {
          const isOpen = expanded.has(season.seasonNumber);
          return (
            <div key={season.seasonNumber} className={classes.season}>
              <ShowSeasonHeader
                season={season}
                expanded={isOpen}
                searching={
                  seasonSearchMutation.isPending &&
                  seasonSearchMutation.variables === season.seasonNumber
                }
                monitoring={
                  monitorMutation.isPending &&
                  monitorMutation.variables?.seasonNumber === season.seasonNumber
                }
                onToggleExpand={() => toggleExpand(season.seasonNumber)}
                onToggleMonitor={() =>
                  monitorMutation.mutate({
                    seasonNumber: season.seasonNumber,
                    monitored: !season.monitored,
                  })
                }
                onSearch={() => seasonSearchMutation.mutate(season.seasonNumber)}
                onInteractiveSearch={() =>
                  setInteractive({ seasonNumber: season.seasonNumber })
                }
                onPreviewRename={() =>
                  setSeasonModal({ kind: "organize", seasonNumber: season.seasonNumber })
                }
                onManageFiles={() =>
                  setSeasonModal({ kind: "manage", seasonNumber: season.seasonNumber })
                }
                onHistory={() =>
                  setSeasonModal({ kind: "history", seasonNumber: season.seasonNumber })
                }
              />
              {isOpen && (
                <div className={classes.body}>
                  {episodesQuery.isLoading && (
                    <Group justify="center" py="sm">
                      <Loader size="xs" />
                    </Group>
                  )}
                  {episodesQuery.error && (
                    <Text c="red" size="sm" py="sm">
                      {episodesQuery.error instanceof Error
                        ? episodesQuery.error.message
                        : "Failed to load episodes"}
                    </Text>
                  )}
                  {episodesQuery.isSuccess && (
                    <ShowEpisodeTable
                      episodes={episodesBySeason.get(season.seasonNumber) ?? []}
                      searchingEpisodeId={
                        episodeSearchMutation.isPending
                          ? episodeSearchMutation.variables?.id
                          : undefined
                      }
                      onSearch={(episode) => episodeSearchMutation.mutate(episode)}
                      onInteractiveSearch={(episode) =>
                        setInteractive({
                          seasonNumber: episode.seasonNumber,
                          episodeId: episode.id,
                          episodeNumber: episode.episodeNumber,
                          episodeTitle: episode.title,
                        })
                      }
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <ShowInteractiveSearchModal
        key={`interactive-${interactive?.seasonNumber ?? "series"}-${interactive?.episodeId ?? "none"}`}
        opened={interactive != null}
        onClose={() => setInteractive(null)}
        instanceId={instanceId}
        seriesId={seriesId}
        title={title}
        year={year}
        seasonNumber={interactive?.seasonNumber}
        episodeId={interactive?.episodeId}
        episodeNumber={interactive?.episodeNumber}
        episodeTitle={interactive?.episodeTitle}
      />
      <ShowHistoryModal
        key={`history-${seasonModal?.kind === "history" ? seasonModal.seasonNumber : "closed"}`}
        opened={seasonModal?.kind === "history"}
        onClose={() => setSeasonModal(null)}
        instanceId={instanceId}
        seriesId={seriesId}
        seasonNumber={seasonModal?.kind === "history" ? seasonModal.seasonNumber : undefined}
      />
      <ShowOrganizeModal
        key={`organize-${seasonModal?.kind === "organize" ? seasonModal.seasonNumber : "closed"}`}
        opened={seasonModal?.kind === "organize"}
        onClose={() => setSeasonModal(null)}
        instanceId={instanceId}
        seriesId={seriesId}
        seriesPath={seriesPath}
        seriesType={seriesType}
        seasonNumber={seasonModal?.kind === "organize" ? seasonModal.seasonNumber : undefined}
      />
      <ShowManageFilesModal
        key={`manage-${seasonModal?.kind === "manage" ? seasonModal.seasonNumber : "closed"}`}
        opened={seasonModal?.kind === "manage"}
        onClose={() => setSeasonModal(null)}
        instanceId={instanceId}
        seriesId={seriesId}
        title={title}
        seasonNumber={seasonModal?.kind === "manage" ? seasonModal.seasonNumber : undefined}
      />
    </>
  );
}
