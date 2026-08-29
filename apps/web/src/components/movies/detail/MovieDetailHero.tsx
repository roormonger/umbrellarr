import { Badge, Group, Text } from "@mantine/core";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import type { MoviePageDetail } from "@umbrellarr/shared";
import { formatFreeSpace } from "@/lib/moviePath";
import classes from "./MovieDetailHero.module.css";

const availabilityLabel: Record<MoviePageDetail["availability"], string> = {
  downloaded: "Downloaded",
  missing: "Missing",
  unavailable: "Unavailable",
  unmonitored: "Unmonitored",
};

function formatRuntime(minutes?: number): string | undefined {
  if (minutes == null || minutes <= 0) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function RatingBadge({
  label,
  value,
  color,
  textColor = "#fff",
}: {
  label: string;
  value?: number;
  color: string;
  textColor?: string;
}) {
  if (value == null) return null;
  const suffix = label === "RT" || label === "Trakt" ? "%" : "";
  return (
    <Badge size="sm" variant="filled" style={{ background: color, color: textColor }}>
      {label} {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
      {suffix}
    </Badge>
  );
}

export function MovieDetailHero({ movie }: { movie: MoviePageDetail }) {
  const runtime = formatRuntime(movie.runtime);
  const size =
    movie.sizeOnDisk != null && movie.sizeOnDisk > 0
      ? formatFreeSpace(movie.sizeOnDisk)
      : undefined;

  const chips: Array<{ label: string; value: string }> = [
    { label: "Path", value: movie.path },
    { label: "Status", value: availabilityLabel[movie.availability] },
  ];
  if (movie.qualityProfileName) {
    chips.push({ label: "Quality", value: movie.qualityProfileName });
  }
  if (size) chips.push({ label: "Size", value: size });
  if (movie.collection) chips.push({ label: "Collection", value: movie.collection });
  if (movie.originalLanguage) {
    chips.push({ label: "Original Language", value: movie.originalLanguage });
  }
  if (movie.studio) chips.push({ label: "Studio", value: movie.studio });
  if (movie.genres.length) chips.push({ label: "Genres", value: movie.genres.join(", ") });

  return (
    <section className={classes.hero}>
      {movie.fanartUrl ? (
        <div className={classes.fanart} style={{ backgroundImage: `url(${movie.fanartUrl})` }} />
      ) : (
        <div className={classes.fanartFallback} />
      )}
      <div className={classes.overlay} />

      <div className={classes.content}>
        <div className={classes.poster}>
          {movie.posterUrl ? (
            <img src={movie.posterUrl} alt="" />
          ) : (
            <div style={{ aspectRatio: "2 / 3", background: "var(--mantine-color-dark-5)" }} />
          )}
        </div>

        <div className={classes.meta}>
          <div className={classes.titleRow}>
            {movie.monitored && (
              <span className={classes.monitored} aria-label="Monitored" title="Monitored">
                <BookmarkSimpleIcon weight="fill" size={22} />
              </span>
            )}
            <h1 className={classes.title}>{movie.title}</h1>
          </div>

          <div className={classes.subline}>
            {movie.certification && <Text span>{movie.certification}</Text>}
            {movie.year != null && <Text span>{movie.year}</Text>}
            {runtime && <Text span>{runtime}</Text>}
          </div>

          <div className={classes.ratings}>
            <RatingBadge label="TMDb" value={movie.tmdbRating} color="#01b4e4" />
            <RatingBadge
              label="IMDb"
              value={movie.imdbRating}
              color="#f5c518"
              textColor="#111"
            />
            <RatingBadge label="RT" value={movie.tomatoRating} color="#fa320a" />
            <RatingBadge label="Trakt" value={movie.traktRating} color="#ed1c24" />
          </div>

          <div className={classes.chips}>
            {chips.map((chip) => (
              <Badge key={chip.label} size="sm" variant="light" color="gray" title={chip.label}>
                <Group gap={4} wrap="nowrap">
                  <Text span size="xs" c="dimmed">
                    {chip.label}
                  </Text>
                  <Text span size="xs">
                    {chip.value}
                  </Text>
                </Group>
              </Badge>
            ))}
          </div>

          {movie.overview && <p className={classes.overview}>{movie.overview}</p>}
        </div>
      </div>
    </section>
  );
}
