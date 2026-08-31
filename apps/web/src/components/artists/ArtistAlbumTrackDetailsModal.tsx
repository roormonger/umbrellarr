import { Modal, Stack, Text } from "@mantine/core";
import type { ArtistAlbumTrack } from "@umbrellarr/shared";
import classes from "./ArtistAlbumModal.module.css";

type Props = {
  opened: boolean;
  onClose: () => void;
  track: ArtistAlbumTrack | null;
  albumTitle: string;
  artistName: string;
};

function formatDuration(ms?: number): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div className={classes.detailRow}>
      <Text size="sm" c="dimmed" className={classes.detailLabel}>
        {label}
      </Text>
      <Text size="sm" className={classes.detailValue} ff={label.startsWith("MusicBrainz") ? "monospace" : undefined}>
        {value}
      </Text>
    </div>
  );
}

export function ArtistAlbumTrackDetailsModal({
  opened,
  onClose,
  track,
  albumTitle,
  artistName,
}: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title="Details" size="lg" centered>
      {track && (
        <Stack gap={6} className={classes.detailsList}>
          <Row label="Filename" value={track.path ?? track.relativePath} />
          <Row label="Track Title" value={track.title} />
          <Row label="Track Number" value={track.trackNumber || track.absoluteTrackNumber} />
          <Row label="Disc Number" value={track.mediumNumber} />
          <Row label="Disc Count" value={track.mediumCount} />
          <Row label="Album" value={albumTitle} />
          <Row label="Artist" value={artistName} />
          <Row label="Country" value={track.country} />
          <Row label="Year" value={track.year} />
          <Row label="Label" value={track.label} />
          <Row label="Duration" value={formatDuration(track.durationMs)} />
          <Row label="MusicBrainz Artist ID" value={track.foreignArtistId} />
          <Row label="MusicBrainz Album ID" value={track.foreignAlbumId} />
          <Row label="MusicBrainz Release ID" value={track.foreignReleaseId} />
          <Row label="MusicBrainz Recording ID" value={track.foreignRecordingId} />
          <Row label="MusicBrainz Track ID" value={track.foreignTrackId} />
        </Stack>
      )}
    </Modal>
  );
}
