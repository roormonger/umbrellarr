import { ActionIcon, Text, Tooltip } from "@mantine/core";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import type { DiscoverRow } from "@umbrellarr/shared";
import { useNavigate } from "@tanstack/react-router";
import { DiscoverPosterCard } from "./DiscoverPosterCard";
import classes from "./Discover.module.css";

export type DiscoverListSearch = {
  genre?: string;
  studio?: string;
  network?: string;
  sortBy?: string;
  upcoming?: "true";
  label?: string;
};

function seeMoreSearch(row: DiscoverRow): DiscoverListSearch {
  if (row.kind === "posters") {
    if (row.key.includes("upcoming")) return { upcoming: "true" };
    if (row.key.includes("trending")) return { sortBy: "trending" };
    return {};
  }
  return {};
}

export function DiscoverMediaRow({
  row,
  instanceId,
  mediaType,
}: {
  row: DiscoverRow;
  instanceId: string;
  mediaType: "movie" | "tv";
}) {
  const navigate = useNavigate();
  const listPath = mediaType === "movie" ? "/discover/$instanceId/movies" : "/discover/$instanceId/tv";

  function openSeeMore(search: DiscoverListSearch = {}) {
    void navigate({
      to: listPath,
      params: { instanceId },
      search: {
        genre: search.genre,
        studio: search.studio,
        network: search.network,
        sortBy: search.sortBy,
        upcoming: search.upcoming,
        label: search.label,
      },
    });
  }

  return (
    <div className={classes.row}>
      <div className={classes.rowHeader}>
        <Text className={classes.rowTitle}>{row.title}</Text>
        {row.kind === "posters" ? (
          <Tooltip label="See more">
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={`See more ${row.title}`}
              onClick={() => openSeeMore(seeMoreSearch(row))}
            >
              <CaretRightIcon size={18} />
            </ActionIcon>
          </Tooltip>
        ) : null}
      </div>
      <div className={classes.rowScroll}>
        {row.kind === "posters"
          ? row.items.map((item) => (
              <DiscoverPosterCard key={`${item.mediaType}-${item.tmdbId}`} item={item} instanceId={instanceId} />
            ))
          : null}

        {row.kind === "genres"
          ? row.items.map((tile) => (
              <button
                key={tile.id}
                type="button"
                className={`${classes.tile} ${classes.tileWide}`}
                onClick={() => openSeeMore({ genre: String(tile.id), label: tile.name })}
              >
                {tile.imageUrl ? (
                  <img src={tile.imageUrl} alt="" className={classes.tileImg} loading="lazy" />
                ) : null}
                <span className={classes.tileLabel}>{tile.name}</span>
              </button>
            ))
          : null}

        {row.kind === "companies"
          ? row.items.map((tile) => (
              <button
                key={tile.id}
                type="button"
                className={classes.tile}
                onClick={() =>
                  openSeeMore(
                    row.companyKind === "studio"
                      ? { studio: String(tile.id), label: tile.name }
                      : { network: String(tile.id), label: tile.name },
                  )
                }
              >
                <img src={tile.imageUrl} alt={tile.name} className={classes.tileLogo} loading="lazy" />
              </button>
            ))
          : null}
      </div>
    </div>
  );
}
