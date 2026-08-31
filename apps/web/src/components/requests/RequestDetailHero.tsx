import { Badge, Text } from "@mantine/core";
import type { RequestStatus, SeerrMediaDetail } from "@umbrellarr/shared";
import {
  MediaDetailHero,
  MetaRow,
  type MediaDetailRating,
} from "@/components/media/detail/MediaDetailHero";

function formatRuntime(minutes?: number): string | undefined {
  if (minutes == null || minutes <= 0) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatVote(value?: number): string | undefined {
  if (value == null || value <= 0) return undefined;
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function statusLabel(status: RequestStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

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

type Props = {
  media: SeerrMediaDetail;
  requestStatus: RequestStatus;
  requestedBy?: string;
};

export function RequestDetailHero({ media, requestStatus, requestedBy }: Props) {
  const runtime = formatRuntime(media.runtime);
  const sublineParts = [
    media.certification,
    media.year,
    runtime,
    media.genres.slice(0, 3).join(", ") || undefined,
  ].filter((part): part is string => Boolean(part));

  const vote = formatVote(media.voteAverage);
  const ratingParts: MediaDetailRating[] = vote
    ? [{ label: "TMDb", value: vote }]
    : [];

  const directors = media.crew
    .filter((c) => c.job === "Director")
    .map((c) => c.personName);
  const producers = media.crew
    .filter((c) => c.job === "Producer" || c.job === "Executive Producer")
    .map((c) => c.personName)
    .slice(0, 6);

  return (
    <MediaDetailHero
      title={media.year ? `${media.title} (${media.year})` : media.title}
      posterUrl={media.posterUrl}
      overview={media.overview}
      sublineParts={sublineParts}
      ratingParts={ratingParts}
      links={media.links}
      hideMonitor
      hideTrailer={!media.trailerYouTubeId}
      youTubeTrailerId={media.trailerYouTubeId}
      meta={
        <>
          <MetaRow label="Request">
            <Badge size="sm" color={statusColor(requestStatus)} variant="light">
              {statusLabel(requestStatus)}
            </Badge>
          </MetaRow>
          {requestedBy ? (
            <MetaRow label="Requested by">
              <Text size="sm">{requestedBy}</Text>
            </MetaRow>
          ) : null}
          {media.productionStatus ? (
            <MetaRow label="Status">
              <Text size="sm">{media.productionStatus}</Text>
            </MetaRow>
          ) : null}
          {media.mediaAvailability ? (
            <MetaRow label="Availability">
              <Text size="sm">
                {media.mediaAvailability.charAt(0).toUpperCase() +
                  media.mediaAvailability.slice(1)}
              </Text>
            </MetaRow>
          ) : null}
          {media.releaseDate || media.firstAirDate ? (
            <MetaRow label={media.mediaType === "tv" ? "First air date" : "Release date"}>
              <Text size="sm">{media.releaseDate || media.firstAirDate}</Text>
            </MetaRow>
          ) : null}
          {media.originalLanguage ? (
            <MetaRow label="Language">
              <Text size="sm">{media.originalLanguage.toUpperCase()}</Text>
            </MetaRow>
          ) : null}
          {media.network ? (
            <MetaRow label="Network">
              <Text size="sm">{media.network}</Text>
            </MetaRow>
          ) : null}
          {media.studio ? (
            <MetaRow label="Studio">
              <Text size="sm">{media.studio}</Text>
            </MetaRow>
          ) : null}
          {media.creators.length > 0 ? (
            <MetaRow label="Creator" wide>
              <Text size="sm">{media.creators.join(", ")}</Text>
            </MetaRow>
          ) : null}
          {directors.length > 0 ? (
            <MetaRow label="Director" wide>
              <Text size="sm">{directors.join(", ")}</Text>
            </MetaRow>
          ) : null}
          {producers.length > 0 ? (
            <MetaRow label="Producer" wide>
              <Text size="sm">{producers.join(", ")}</Text>
            </MetaRow>
          ) : null}
          {media.tagline ? (
            <MetaRow label="Tagline" wide>
              <Text size="sm" fs="italic">
                {media.tagline}
              </Text>
            </MetaRow>
          ) : null}
        </>
      }
    />
  );
}
