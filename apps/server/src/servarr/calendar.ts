import type {
  Availability,
  CalendarEvent,
  CalendarMovieReleaseType,
  CalendarResponse,
  Instance,
} from "@umbrellarr/shared";
import { arrJson } from "./client.js";
import { moviePosterStatus } from "./posterStatus.js";
import { fetchQueueEntityIds } from "./queueIds.js";

type RadarrCalendarMovie = {
  id: number;
  title: string;
  year?: number;
  monitored: boolean;
  hasFile?: boolean;
  isAvailable?: boolean;
  status?: string;
  genres?: string[];
  certification?: string;
  inCinemas?: string;
  digitalRelease?: string;
  physicalRelease?: string;
};

type SonarrCalendarEpisode = {
  id: number;
  seriesId: number;
  title?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  airDateUtc?: string;
  airDate?: string;
  hasFile?: boolean;
  monitored?: boolean;
  runtime?: number;
  series?: {
    id?: number;
    title?: string;
    network?: string;
    genres?: string[];
    monitored?: boolean;
  };
};

type LidarrCalendarAlbum = {
  id: number;
  title: string;
  albumType?: string;
  releaseDate?: string;
  monitored?: boolean;
  genres?: string[];
  artistId?: number;
  artist?: {
    id?: number;
    artistName?: string;
    monitored?: boolean;
  };
  statistics?: {
    trackCount?: number;
    trackFileCount?: number;
  };
};

function isoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function dateOnlyKey(iso: string): string {
  return iso.slice(0, 10);
}

function pickMovieRelease(
  movie: RadarrCalendarMovie,
  rangeStart: Date,
  rangeEnd: Date,
): { start: string; releaseType: CalendarMovieReleaseType } | null {
  const candidates: Array<{ start: string; releaseType: CalendarMovieReleaseType }> = [];
  const digital = isoDate(movie.digitalRelease);
  const physical = isoDate(movie.physicalRelease);
  const cinema = isoDate(movie.inCinemas);
  if (digital) candidates.push({ start: digital, releaseType: "digital" });
  if (physical) candidates.push({ start: physical, releaseType: "physical" });
  if (cinema) candidates.push({ start: cinema, releaseType: "cinema" });

  const inRange = candidates.filter((c) => {
    const t = new Date(c.start).getTime();
    return t >= rangeStart.getTime() && t < rangeEnd.getTime();
  });
  if (inRange.length === 0) return null;
  // Prefer digital, then physical, then cinema when multiple fall in range.
  const order: CalendarMovieReleaseType[] = ["digital", "physical", "cinema"];
  inRange.sort((a, b) => order.indexOf(a.releaseType) - order.indexOf(b.releaseType));
  return inRange[0] ?? null;
}

function episodeStatus(input: {
  hasFile: boolean;
  monitored: boolean;
  start: string;
  downloading: boolean;
}): Availability {
  if (input.downloading) return "queued";
  if (input.hasFile && input.monitored) return "downloaded";
  if (input.hasFile && !input.monitored) return "downloadedUnmonitored";
  const aired = new Date(input.start).getTime() <= Date.now();
  if (aired && input.monitored) return "missingMonitored";
  if (aired && !input.monitored) return "missingUnmonitored";
  if (!input.monitored) return "missingUnmonitored";
  return "unreleased";
}

function albumStatus(input: {
  monitored: boolean;
  trackCount: number;
  trackFileCount: number;
  start: string;
}): Availability {
  if (input.trackCount > 0 && input.trackFileCount >= input.trackCount) {
    return input.monitored ? "downloaded" : "downloadedUnmonitored";
  }
  const released = new Date(input.start).getTime() <= Date.now();
  if (released && input.monitored) return "missingMonitored";
  if (released && !input.monitored) return "missingUnmonitored";
  if (!input.monitored) return "missingUnmonitored";
  return "unreleased";
}

function releaseTypeLabel(type: CalendarMovieReleaseType): string {
  switch (type) {
    case "cinema":
      return "Cinemas";
    case "digital":
      return "Digital";
    case "physical":
      return "Physical";
    default:
      return "TBA";
  }
}

export { releaseTypeLabel };

async function fetchRadarrCalendar(
  instance: Instance,
  start: string,
  end: string,
  unmonitored: boolean,
  queuedMovieIds: Set<number>,
): Promise<CalendarEvent[]> {
  const rangeStart = new Date(start);
  const rangeEnd = new Date(end);
  const movies = await arrJson<RadarrCalendarMovie[]>(
    instance,
    `/api/v3/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&unmonitored=${unmonitored}`,
    { timeoutMs: 30_000 },
  );

  const events: CalendarEvent[] = [];
  for (const movie of movies) {
    const release = pickMovieRelease(movie, rangeStart, rangeEnd);
    if (!release) continue;
    const downloading = queuedMovieIds.has(movie.id);
    const status = moviePosterStatus({
      hasFile: Boolean(movie.hasFile),
      monitored: movie.monitored,
      isAvailable: Boolean(movie.isAvailable),
      downloading,
      status: movie.status,
    });
    events.push({
      id: `movie:${instance.id}:${movie.id}:${dateOnlyKey(release.start)}:${release.releaseType}`,
      kind: "movie",
      instanceId: instance.id,
      instanceName: instance.name,
      externalId: movie.id,
      title: movie.year ? `${movie.title} (${movie.year})` : movie.title,
      genres: movie.genres ?? [],
      certification: movie.certification,
      releaseType: release.releaseType,
      start: release.start,
      allDay: true,
      monitored: movie.monitored,
      hasFile: Boolean(movie.hasFile),
      status,
    });
  }
  return events;
}

async function fetchSonarrCalendar(
  instance: Instance,
  start: string,
  end: string,
  unmonitored: boolean,
  queuedSeriesIds: Set<number>,
): Promise<CalendarEvent[]> {
  const episodes = await arrJson<SonarrCalendarEpisode[]>(
    instance,
    `/api/v3/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&unmonitored=${unmonitored}&includeSeries=true`,
    { timeoutMs: 30_000 },
  );

  const events: CalendarEvent[] = [];
  for (const ep of episodes) {
    const startIso = isoDate(ep.airDateUtc) ?? isoDate(ep.airDate);
    if (!startIso) continue;
    const seriesId = ep.seriesId || ep.series?.id;
    if (seriesId == null) continue;
    const seriesTitle = ep.series?.title ?? "Unknown";
    const monitored = ep.monitored ?? ep.series?.monitored ?? false;
    const hasFile = Boolean(ep.hasFile);
    const downloading = queuedSeriesIds.has(seriesId);
    const runtimeMin = ep.runtime && ep.runtime > 0 ? ep.runtime : 0;
    const endIso =
      runtimeMin > 0
        ? new Date(new Date(startIso).getTime() + runtimeMin * 60_000).toISOString()
        : undefined;
    const seasonNumber = ep.seasonNumber;
    const episodeNumber = ep.episodeNumber;

    events.push({
      id: `episode:${instance.id}:${ep.id}`,
      kind: "episode",
      instanceId: instance.id,
      instanceName: instance.name,
      externalId: seriesId,
      episodeId: ep.id,
      title: seriesTitle,
      secondaryTitle: ep.title,
      genres: ep.series?.genres ?? [],
      network: ep.series?.network,
      seasonNumber,
      episodeNumber,
      start: startIso,
      end: endIso,
      allDay: false,
      monitored,
      hasFile,
      status: episodeStatus({ hasFile, monitored, start: startIso, downloading }),
    });
  }
  return events;
}

async function fetchLidarrCalendar(
  instance: Instance,
  start: string,
  end: string,
  unmonitored: boolean,
): Promise<CalendarEvent[]> {
  const albums = await arrJson<LidarrCalendarAlbum[]>(
    instance,
    `/api/v1/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&unmonitored=${unmonitored}&includeArtist=true`,
    { timeoutMs: 30_000 },
  );

  const events: CalendarEvent[] = [];
  for (const album of albums) {
    const startIso = isoDate(album.releaseDate);
    if (!startIso) continue;
    const artistId = album.artistId ?? album.artist?.id;
    if (artistId == null) continue;
    const artistName = album.artist?.artistName ?? "Unknown Artist";
    const monitored = album.monitored ?? album.artist?.monitored ?? false;
    const trackCount = album.statistics?.trackCount ?? 0;
    const trackFileCount = album.statistics?.trackFileCount ?? 0;
    const hasFile = trackCount > 0 && trackFileCount >= trackCount;

    events.push({
      id: `album:${instance.id}:${album.id}`,
      kind: "album",
      instanceId: instance.id,
      instanceName: instance.name,
      externalId: artistId,
      albumId: album.id,
      title: artistName,
      secondaryTitle: album.title,
      genres: album.genres ?? [],
      albumType: album.albumType,
      start: startIso,
      allDay: true,
      monitored,
      hasFile,
      status: albumStatus({
        monitored,
        trackCount,
        trackFileCount,
        start: startIso,
      }),
    });
  }
  return events;
}

export async function fetchUnifiedCalendar(
  instances: Instance[],
  start: string,
  end: string,
  unmonitored = true,
): Promise<CalendarResponse> {
  const arrInstances = instances.filter(
    (i) => i.kind === "radarr" || i.kind === "sonarr" || i.kind === "lidarr",
  );

  const settled = await Promise.allSettled(
    arrInstances.map(async (instance) => {
      if (instance.kind === "radarr") {
        const queued = await fetchQueueEntityIds(instance, "movieId").catch(
          () => new Set<number>(),
        );
        return fetchRadarrCalendar(instance, start, end, unmonitored, queued);
      }
      if (instance.kind === "sonarr") {
        const queued = await fetchQueueEntityIds(instance, "seriesId").catch(
          () => new Set<number>(),
        );
        return fetchSonarrCalendar(instance, start, end, unmonitored, queued);
      }
      return fetchLidarrCalendar(instance, start, end, unmonitored);
    }),
  );

  const events: CalendarEvent[] = [];
  const errors: CalendarResponse["errors"] = [];

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]!;
    const instance = arrInstances[i]!;
    if (result.status === "fulfilled") {
      events.push(...result.value);
    } else {
      const message =
        result.reason instanceof Error ? result.reason.message : "Calendar fetch failed";
      errors.push({
        instanceId: instance.id,
        instanceName: instance.name,
        message,
      });
    }
  }

  events.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  return { events, errors };
}

function icalEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function icalDate(iso: string, allDay: boolean): string {
  if (allDay) {
    return dateOnlyKey(iso).replace(/-/g, "");
  }
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  parts.push(line.slice(0, 75));
  let rest = line.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

export function eventsToIcs(events: CalendarEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Umbrellarr//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Umbrellarr",
  ];

  for (const event of events) {
    const summaryParts = [event.title];
    if (event.kind === "episode" && event.seasonNumber != null && event.episodeNumber != null) {
      summaryParts.push(
        `S${String(event.seasonNumber).padStart(2, "0")}E${String(event.episodeNumber).padStart(2, "0")}`,
      );
    }
    if (event.secondaryTitle) summaryParts.push(event.secondaryTitle);
    if (event.releaseType) summaryParts.push(releaseTypeLabel(event.releaseType));

    const description = [
      event.instanceName,
      event.kind,
      event.genres.length ? event.genres.join(", ") : undefined,
      event.network,
      event.albumType,
      event.certification,
    ]
      .filter(Boolean)
      .join(" · ");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${icalEscape(event.id)}@umbrellarr`);
    lines.push(`DTSTAMP:${icalDate(new Date().toISOString(), false)}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${icalDate(event.start, true)}`);
    } else {
      lines.push(`DTSTART:${icalDate(event.start, false)}`);
      if (event.end) lines.push(`DTEND:${icalDate(event.end, false)}`);
    }
    lines.push(foldLine(`SUMMARY:${icalEscape(summaryParts.join(" — "))}`));
    if (description) {
      lines.push(foldLine(`DESCRIPTION:${icalEscape(description)}`));
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
