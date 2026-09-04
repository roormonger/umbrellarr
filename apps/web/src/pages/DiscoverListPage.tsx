import { Alert, Button, Group, Loader, Text } from "@mantine/core";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useParams, useSearch } from "@tanstack/react-router";
import { listDiscoverMovies, listDiscoverTv } from "@/api/discover";
import { APP_LOADER_SIZE } from "@/components/QuantumLoader";
import { DiscoverAddProvider } from "@/components/discover/DiscoverAddContext";
import { DiscoverPosterCard } from "@/components/discover/DiscoverPosterCard";
import { usePageHeader } from "@/layout/pageHeader";
import { ACTIVITY_LIST_STALE_MS, focusAwareRefetchInterval, SEERR_LIST_POLL_MS } from "@/lib/queryFocus";
import classes from "@/components/discover/Discover.module.css";

export function DiscoverMoviesListPage() {
  const { instanceId } = useParams({ from: "/app/discover/$instanceId/movies" });
  const filters = useSearch({ from: "/app/discover/$instanceId/movies" });
  return (
    <DiscoverListGrid
      instanceId={instanceId}
      mediaType="movie"
      genre={filters.genre}
      studio={filters.studio}
      sortBy={filters.sortBy}
      upcoming={filters.upcoming === "true"}
      label={filters.label}
    />
  );
}

export function DiscoverTvListPage() {
  const { instanceId } = useParams({ from: "/app/discover/$instanceId/tv" });
  const filters = useSearch({ from: "/app/discover/$instanceId/tv" });
  return (
    <DiscoverListGrid
      instanceId={instanceId}
      mediaType="tv"
      genre={filters.genre}
      network={filters.network}
      sortBy={filters.sortBy}
      upcoming={filters.upcoming === "true"}
      label={filters.label}
    />
  );
}

function DiscoverListGrid({
  instanceId,
  mediaType,
  genre,
  studio,
  network,
  sortBy,
  upcoming,
  label,
}: {
  instanceId: string;
  mediaType: "movie" | "tv";
  genre?: string;
  studio?: string;
  network?: string;
  sortBy?: string;
  upcoming?: boolean;
  label?: string;
}) {
  const listQuery = useInfiniteQuery({
    queryKey: ["discover", "list", mediaType, instanceId, { genre, studio, network, sortBy, upcoming }],
    queryFn: ({ pageParam }) =>
      mediaType === "movie"
        ? listDiscoverMovies(instanceId, { page: pageParam, genre, studio, sortBy, upcoming })
        : listDiscoverTv(instanceId, { page: pageParam, genre, network, sortBy, upcoming }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
    staleTime: ACTIVITY_LIST_STALE_MS,
    refetchInterval: focusAwareRefetchInterval(SEERR_LIST_POLL_MS),
  });

  const items = listQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const heading =
    listQuery.data?.pages[0]?.title ||
    label ||
    (genre
      ? "Genre"
      : studio
        ? "Studio"
        : network
          ? "Network"
          : mediaType === "movie"
            ? "Movies"
            : "Shows");

  usePageHeader(heading, items.length ? items.length.toLocaleString() : null, "/discover");

  return (
    <DiscoverAddProvider>
      <div className={classes.listPage}>
      {listQuery.isLoading ? (
        <Group justify="center" py="xl">
          <Loader size={APP_LOADER_SIZE} />
        </Group>
      ) : null}

      {listQuery.error ? (
        <Alert color="red" title="Could not load list">
          {listQuery.error instanceof Error ? listQuery.error.message : "Unknown error"}
        </Alert>
      ) : null}

      {!listQuery.isLoading && items.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No titles found.
        </Text>
      ) : null}

      <div className={classes.listGrid}>
        {items.map((item) => (
          <DiscoverPosterCard
            key={`${item.mediaType}-${item.tmdbId}`}
            item={item}
            instanceId={instanceId}
          />
        ))}
      </div>

      {listQuery.hasNextPage ? (
        <div className={classes.loadMore}>
          <Button
            variant="default"
            loading={listQuery.isFetchingNextPage}
            onClick={() => void listQuery.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      ) : null}
      </div>
    </DiscoverAddProvider>
  );
}
