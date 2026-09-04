import { Alert, Group, Loader, Text, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getDiscoverHome, searchDiscover } from "@/api/discover";
import { listInstances } from "@/api/instances";
import { APP_LOADER_SIZE } from "@/components/QuantumLoader";
import { DiscoverAddProvider } from "@/components/discover/DiscoverAddContext";
import { DiscoverFeaturedHero } from "@/components/discover/DiscoverFeaturedHero";
import { DiscoverPosterCard } from "@/components/discover/DiscoverPosterCard";
import { DiscoverSectionBlock } from "@/components/discover/DiscoverSectionBlock";
import { usePageHeader } from "@/layout/pageHeader";
import { discoverAccess } from "@/lib/discoverAccess";
import { ACTIVITY_LIST_STALE_MS, DISCOVER_HOME_POLL_MS, DISCOVER_HOME_STALE_MS, focusAwareRefetchInterval, SEERR_LIST_POLL_MS } from "@/lib/queryFocus";
import classes from "@/components/discover/Discover.module.css";

export function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [debounced] = useDebouncedValue(query.trim(), 300);

  const instancesQuery = useQuery({
    queryKey: ["instances"],
    queryFn: listInstances,
    staleTime: 60_000,
  });

  const instances = instancesQuery.data?.instances ?? [];
  const access = useMemo(() => discoverAccess(instances), [instances]);

  const activeInstanceId = useMemo(
    () => instances.find((i) => i.kind === "seerr")?.id,
    [instances],
  );

  const homeQuery = useQuery({
    queryKey: ["discover", "home", activeInstanceId],
    queryFn: () => getDiscoverHome(activeInstanceId!),
    enabled: Boolean(activeInstanceId) && access.canShowDiscover,
    staleTime: DISCOVER_HOME_STALE_MS,
    refetchInterval: focusAwareRefetchInterval(DISCOVER_HOME_POLL_MS),
  });

  const searchResultsQuery = useQuery({
    queryKey: ["discover", "search", activeInstanceId, debounced],
    queryFn: () => searchDiscover(activeInstanceId!, debounced),
    enabled: Boolean(activeInstanceId) && access.canShowDiscover && debounced.length > 0,
    staleTime: ACTIVITY_LIST_STALE_MS,
    refetchInterval: focusAwareRefetchInterval(SEERR_LIST_POLL_MS),
  });

  const featuredItems = useMemo(() => {
    const items = homeQuery.data?.featured ?? [];
    return items.filter((item) =>
      item.mediaType === "movie" ? access.canShowMovies : access.canShowShows,
    );
  }, [homeQuery.data?.featured, access.canShowMovies, access.canShowShows]);

  const searchItems = useMemo(() => {
    const items = searchResultsQuery.data?.items ?? [];
    return items.filter((item) =>
      item.mediaType === "movie" ? access.canShowMovies : access.canShowShows,
    );
  }, [searchResultsQuery.data?.items, access.canShowMovies, access.canShowShows]);

  const searchPlaceholder =
    access.canShowMovies && access.canShowShows
      ? "Search movies & shows…"
      : access.canShowMovies
        ? "Search movies…"
        : "Search shows…";

  usePageHeader("Discover");

  if (instancesQuery.isLoading) {
    return (
      <Group justify="center" py="xl">
        <Loader size={APP_LOADER_SIZE} />
      </Group>
    );
  }

  if (!access.canShowDiscover || !activeInstanceId) {
    return (
      <Alert color="gray" title="Discover unavailable">
        Discover needs a Seerr instance plus Radarr and/or Sonarr. Add them in Settings.
      </Alert>
    );
  }

  return (
    <DiscoverAddProvider>
      <div className={classes.page}>
        <div className={classes.header}>
          <TextInput
            placeholder={searchPlaceholder}
            leftSection={<MagnifyingGlassIcon size={16} />}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            style={{ flex: 1, minWidth: 220, maxWidth: 420 }}
          />
        </div>

        {debounced ? (
          <div className={classes.searchResults}>
            <Text fw={600}>Search results</Text>
            {searchResultsQuery.isLoading ? (
              <Group justify="center" py="md">
                <Loader size={APP_LOADER_SIZE} />
              </Group>
            ) : searchResultsQuery.error ? (
              <Alert color="red">
                {searchResultsQuery.error instanceof Error
                  ? searchResultsQuery.error.message
                  : "Search failed"}
              </Alert>
            ) : searchItems.length === 0 ? (
              <Text c="dimmed" size="sm">
                No results.
              </Text>
            ) : (
              <div className={classes.searchGrid}>
                {searchItems.map((item) => (
                  <DiscoverPosterCard
                    key={`${item.mediaType}-${item.tmdbId}`}
                    item={item}
                    instanceId={activeInstanceId}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {homeQuery.isLoading ? (
          <Group justify="center" py="xl">
            <Loader size={APP_LOADER_SIZE} />
          </Group>
        ) : homeQuery.error ? (
          <Alert color="red" title="Could not load Discover">
            {homeQuery.error instanceof Error ? homeQuery.error.message : "Unknown error"}
          </Alert>
        ) : homeQuery.data && !debounced ? (
          <>
            <DiscoverFeaturedHero items={featuredItems} instanceId={activeInstanceId} />
            {access.canShowMovies ? (
              <DiscoverSectionBlock section={homeQuery.data.movies} instanceId={activeInstanceId} />
            ) : null}
            {access.canShowShows ? (
              <DiscoverSectionBlock section={homeQuery.data.shows} instanceId={activeInstanceId} />
            ) : null}
          </>
        ) : null}
      </div>
    </DiscoverAddProvider>
  );
}
