import {
  Button,
  Group,
  Menu,
  Modal,
  Text,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { FunnelIcon } from "@phosphor-icons/react/dist/csr/Funnel";
import type { MovieRelease } from "@umbrellarr/shared";
import { Quantum } from "ldrs/react";
import { useMemo, useState } from "react";
import {
  getMovieBlocklist,
  getMovieHistory,
  getMovieReleases,
} from "@/api/movies";
import { MovieInteractiveSearchTable } from "@/components/movies/MovieInteractiveSearchTable";
import classes from "./MovieInteractiveSearchModal.module.css";
import "ldrs/react/Quantum.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  instanceId: string;
  movieId: number;
  title: string;
  year?: number;
};

type FilterKey = "all" | "approved" | "rejected" | "usenet" | "torrent";

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "All",
  approved: "Approved",
  rejected: "Rejected",
  usenet: "Usenet",
  torrent: "Torrent",
};

function filterReleases(releases: MovieRelease[], filter: FilterKey): MovieRelease[] {
  switch (filter) {
    case "approved":
      return releases.filter((r) => r.rejections.length === 0);
    case "rejected":
      return releases.filter((r) => r.rejections.length > 0);
    case "usenet":
      return releases.filter((r) => r.protocol === "usenet");
    case "torrent":
      return releases.filter((r) => r.protocol === "torrent");
    default:
      return releases;
  }
}

function SearchLoading() {
  return (
    <div className={classes.loading} role="status" aria-live="polite">
      {/* LDRS Quantum — https://uiball.com/ldrs/ */}
      <Quantum size={56} speed={2.3} color="var(--mantine-color-violet-5)" />
      <Text size="sm" c="dimmed">
        Searching indexers…
      </Text>
    </div>
  );
}

export function MovieInteractiveSearchModal({
  opened,
  onClose,
  instanceId,
  movieId,
  title,
  year,
}: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const releasesQuery = useQuery({
    queryKey: ["movie-releases", instanceId, movieId],
    queryFn: () => getMovieReleases(instanceId, movieId),
    enabled: opened,
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: false,
  });

  const historyQuery = useQuery({
    queryKey: ["movie-history", instanceId, movieId],
    queryFn: () => getMovieHistory(instanceId, movieId),
    enabled: opened,
    staleTime: 60_000,
  });

  const blocklistQuery = useQuery({
    queryKey: ["movie-blocklist", instanceId, movieId],
    queryFn: () => getMovieBlocklist(instanceId, movieId),
    enabled: opened,
    staleTime: 60_000,
  });

  const filtered = useMemo(
    () => filterReleases(releasesQuery.data?.releases ?? [], filter),
    [releasesQuery.data?.releases, filter],
  );

  const heading = year
    ? `Interactive Search - ${title} (${year})`
    : `Interactive Search - ${title}`;

  const total = releasesQuery.data?.releases.length ?? 0;
  const shown = filtered.length;
  const filterHidesSome =
    releasesQuery.isSuccess && filter !== "all" && shown < total;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={heading}
      size="95%"
      centered
      styles={{
        content: { maxWidth: 1400 },
      }}
    >
      <Group justify="flex-end" mb="sm">
        <Menu shadow="md" width={180} position="bottom-end">
          <Menu.Target>
            <Button
              variant="default"
              size="xs"
              leftSection={<FunnelIcon size={14} />}
              rightSection={<CaretDownIcon size={12} />}
            >
              Filter
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
              <Menu.Item
                key={key}
                leftSection={filter === key ? <CheckIcon size={14} /> : <span style={{ width: 14 }} />}
                onClick={() => setFilter(key)}
              >
                {FILTER_LABELS[key]}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>

      {releasesQuery.isLoading && <SearchLoading />}

      {releasesQuery.error && (
        <Text c="red" size="sm" py="md">
          {releasesQuery.error instanceof Error
            ? releasesQuery.error.message
            : "Interactive search failed"}
        </Text>
      )}

      {releasesQuery.isSuccess && total === 0 && (
        <Text c="dimmed" size="sm" ta="center" py="xl">
          No releases found from interactive indexers.
        </Text>
      )}

      {releasesQuery.isSuccess && total > 0 && (
        <>
          {filterHidesSome && (
            <Text size="xs" c="dimmed" mb="xs">
              Showing {shown} of {total} releases ({FILTER_LABELS[filter]})
            </Text>
          )}
          <MovieInteractiveSearchTable
            instanceId={instanceId}
            movieId={movieId}
            releases={filtered}
            history={historyQuery.data?.events ?? []}
            blocklist={blocklistQuery.data?.items ?? []}
          />
        </>
      )}

      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Modal>
  );
}
