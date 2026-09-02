import { Badge, Checkbox, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import { ProhibitIcon } from "@phosphor-icons/react/dist/csr/Prohibit";
import { useNavigate } from "@tanstack/react-router";
import type { CollectionListItem, CollectionMovieItem } from "@umbrellarr/shared";
import { memo, type MouseEvent } from "react";
import { letterKey } from "@/lib/alphabet";
import classes from "./CollectionRow.module.css";

function missingLabel(count: number): string {
  if (count === 1) return "1 missing movie from library";
  return `${count} missing movies from library`;
}

function movieLabel(movie: CollectionMovieItem): string {
  return movie.year ? `${movie.title} (${movie.year})` : movie.title;
}

function CollectionPoster({
  instanceId,
  movie,
}: {
  instanceId: string;
  movie: CollectionMovieItem;
}) {
  const navigate = useNavigate();
  const existing = Boolean(movie.isExisting && movie.movieId != null);
  const label = movieLabel(movie);

  function openDetail(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!existing || movie.movieId == null) return;
    void navigate({
      to: "/movies/$instanceId/$movieId",
      params: { instanceId, movieId: String(movie.movieId) },
      state: { backTo: `/movies/${instanceId}/collections` } as never,
    });
  }

  const poster = movie.posterUrl ? (
    <img src={movie.posterUrl} alt="" className={classes.posterImg} />
  ) : (
    <div className={classes.posterFallback} aria-hidden>
      {movie.title.slice(0, 1).toUpperCase()}
    </div>
  );

  if (existing) {
    return (
      <Tooltip label={label} withArrow>
        <UnstyledButton
          className={classes.posterButton}
          onClick={openDetail}
          aria-label={label}
          data-collection-poster
          data-existing="true"
        >
          {poster}
        </UnstyledButton>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={movie.isExcluded ? `${label} (excluded)` : label} withArrow>
      <div
        className={classes.posterMuted}
        data-collection-poster
        data-existing="false"
        data-excluded={movie.isExcluded || undefined}
        aria-label={label}
      >
        {poster}
        {movie.isExcluded ? (
          <span className={classes.excludedMark}>
            <ProhibitIcon size={14} weight="bold" />
          </span>
        ) : null}
      </div>
    </Tooltip>
  );
}

export const CollectionRow = memo(function CollectionRow({
  collection,
  selected,
  onToggle,
}: {
  collection: CollectionListItem;
  selected: boolean;
  onToggle: (id: number, checked: boolean) => void;
}) {
  return (
    <div
      className={classes.row}
      data-collection-row
      data-collection-id={collection.externalId}
      data-letter={letterKey(collection.sortTitle)}
    >
      <Checkbox
        aria-label={`Select ${collection.title}`}
        checked={selected}
        onChange={(e) => onToggle(collection.externalId, e.currentTarget.checked)}
        className={classes.checkbox}
      />

      <div className={classes.body}>
        <div className={classes.titleRow}>
          <span
            className={collection.monitored ? classes.monitored : classes.unmonitored}
            aria-label={collection.monitored ? "Monitored" : "Unmonitored"}
          >
            <BookmarkSimpleIcon size={16} weight={collection.monitored ? "fill" : "regular"} />
          </span>
          <Text fw={650} size="lg" className={classes.title}>
            {collection.title}
          </Text>
          {collection.missingMovies > 0 ? (
            <Badge color="orange" variant="light" size="sm">
              {missingLabel(collection.missingMovies)}
            </Badge>
          ) : null}
        </div>

        <div className={classes.meta}>
          {collection.qualityProfileName ? (
            <Badge variant="outline" color="gray" size="sm">
              {collection.qualityProfileName}
            </Badge>
          ) : null}
          {collection.rootFolderPath ? (
            <Badge variant="outline" color="gray" size="sm">
              {collection.rootFolderPath}
            </Badge>
          ) : null}
          {collection.genres.length > 0 ? (
            <Text size="sm" c="dimmed">
              {collection.genres.join(", ")}
            </Text>
          ) : null}
        </div>

        {collection.overview ? (
          <Text size="sm" c="dimmed" lineClamp={3} className={classes.overview}>
            {collection.overview}
          </Text>
        ) : null}

        {collection.movies.length > 0 ? (
          <div className={classes.strip} aria-label={`${collection.title} movies`}>
            {collection.movies.map((movie) => (
              <CollectionPoster
                key={movie.tmdbId}
                instanceId={collection.instanceId}
                movie={movie}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
});
