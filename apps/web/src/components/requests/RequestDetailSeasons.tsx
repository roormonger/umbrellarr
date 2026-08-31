import { Badge, Text } from "@mantine/core";
import type { RequestStatus, SeerrMediaSeasonDetail } from "@umbrellarr/shared";
import panel from "@/components/movies/detail/MovieDetailPanel.module.css";
import classes from "./RequestDetailSeasons.module.css";

function statusColor(status: RequestStatus): string {
  switch (status) {
    case "pending":
      return "yellow";
    case "approved":
    case "completed":
      return "teal";
    case "declined":
    case "failed":
      return "red";
    default:
      return "gray";
  }
}

export function RequestDetailSeasons({ seasons }: { seasons: SeerrMediaSeasonDetail[] }) {
  if (seasons.length === 0) return null;

  return (
    <section className={panel.panel} aria-label="Seasons">
      <Text className={panel.heading}>Seasons</Text>
      <div className={classes.list}>
        {seasons.map((season) => (
          <div key={season.seasonNumber} className={classes.row}>
            <div className={classes.meta}>
              <Text size="sm" fw={600}>
                {season.seasonNumber === 0
                  ? "Specials"
                  : season.name?.trim() || `Season ${season.seasonNumber}`}
              </Text>
              <Text size="xs" c="dimmed">
                {season.episodeCount != null
                  ? `${season.episodeCount} episode${season.episodeCount === 1 ? "" : "s"}`
                  : "—"}
              </Text>
            </div>
            {season.requestStatus ? (
              <Badge size="sm" color={statusColor(season.requestStatus)} variant="light">
                {season.requestStatus.charAt(0).toUpperCase() + season.requestStatus.slice(1)}
              </Badge>
            ) : (
              <Badge size="sm" color="gray" variant="outline">
                Not requested
              </Badge>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
