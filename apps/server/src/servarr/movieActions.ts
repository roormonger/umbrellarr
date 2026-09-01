import {
  MovieHistoryEventTypeSchema,
  MovieMinimumAvailabilitySchema,
  MovieReleaseProtocolSchema,
  type Availability,
  type MovieAddRequest,
  type MovieAlternativeTitle,
  type MovieBlocklistItem,
  type MovieCredit,
  type MovieDetail,
  type MovieEditOptions,
  type MovieExtraFile,
  type MovieFile,
  type MovieHistoryEvent,
  type MovieHistoryEventType,
  type MovieFileBulkUpdateItem,
  type MovieIndexerFlagOption,
  type MovieLanguageOption,
  type MovieLink,
  type MovieLookupItem,
  type MovieManageFile,
  type MovieMinimumAvailability,
  type MovieNamingConfig,
  type MoviePageDetail,
  type MovieQualityOption,
  type MovieRelease,
  type MovieReleaseGrabRequest,
  type MovieReleaseLanguage,
  type MovieReleaseQuality,
  type MovieRenamePreview,
  type MovieUpdateRequest,
  type Instance,
} from "@umbrellarr/shared";
import { arrJson } from "./client.js";
import { toGridPosterPath } from "./mediaCover.js";
import { moviePosterStatus } from "./posterStatus.js";

type RadarrImage = {
  coverType?: string;
  url?: string;
  remoteUrl?: string;
};

type RadarrMovie = {
  id: number;
  title: string;
  year?: number;
  overview?: string;
  runtime?: number;
  monitored: boolean;
  hasFile?: boolean;
  isAvailable?: boolean;
  status?: string;
  minimumAvailability?: string;
  qualityProfileId: number;
  path?: string;
  sizeOnDisk?: number;
  tags?: number[];
  tmdbId?: number;
  imdbId?: string;
  youTubeTrailerId?: string;
  studio?: string;
  certification?: string;
  genres?: string[];
  /** Suggested folder name from lookup (e.g. "Rocky (1976)"). */
  folder?: string;
  originalLanguage?: { id?: number; name?: string };
  collection?: { title?: string; name?: string };
  ratings?: {
    imdb?: { value?: number };
    tmdb?: { value?: number };
    rottenTomatoes?: { value?: number };
    trakt?: { value?: number };
  };
  images?: RadarrImage[];
  [key: string]: unknown;
};

type QualityProfile = { id: number; name: string };
type ArrTag = { id: number; label: string };
type ArrRootFolder = { id: number; path: string; freeSpace?: number | null };

type RadarrMovieFile = {
  id: number;
  relativePath?: string;
  size?: number;
  releaseGroup?: string;
  customFormatScore?: number;
  indexerFlags?: number;
  languages?: Array<{ id?: number; name?: string }>;
  quality?: {
    quality?: {
      id?: number;
      name?: string;
      source?: string;
      resolution?: number;
      modifier?: string;
    };
    revision?: { version?: number; real?: number; isRepack?: boolean };
  };
  customFormats?: Array<{ name?: string }>;
  mediaInfo?: {
    videoCodec?: string;
    audioCodec?: string;
    audioChannels?: number;
    audioLanguages?: string;
  };
};

type RadarrQualitySchemaItem = {
  quality?: {
    id?: number;
    name?: string;
    source?: string;
    resolution?: number;
    modifier?: string;
  };
  items?: RadarrQualitySchemaItem[];
};

type RadarrExtraFile = {
  id: number;
  relativePath?: string;
  extension?: string;
  type?: string;
};

type RadarrCredit = {
  id: number;
  type?: "cast" | "crew";
  personName?: string;
  character?: string;
  job?: string;
  order?: number;
  personTmdbId?: number;
  images?: RadarrImage[];
};

type RadarrAltTitle = {
  id: number;
  title?: string;
  sourceType?: string;
};

type RadarrHistory = {
  id: number;
  sourceTitle?: string;
  eventType?: string;
  date?: string;
  downloadId?: string;
  customFormatScore?: number;
  languages?: Array<{ name?: string }>;
  quality?: { quality?: { name?: string } };
  customFormats?: Array<{ name?: string }>;
  data?: Record<string, string | null | undefined>;
};

type RadarrRelease = {
  guid?: string;
  protocol?: string;
  age?: number;
  ageHours?: number;
  ageMinutes?: number;
  publishDate?: string;
  title?: string;
  infoUrl?: string;
  indexerId?: number;
  indexer?: string;
  size?: number;
  seeders?: number;
  leechers?: number;
  quality?: {
    quality?: {
      id?: number;
      name?: string;
      source?: string;
      resolution?: number;
      modifier?: string;
    };
    revision?: { version?: number; real?: number; isRepack?: boolean };
  };
  languages?: Array<{ id?: number; name?: string }>;
  customFormats?: Array<{ name?: string }>;
  customFormatScore?: number;
  indexerFlags?: string[] | number;
  rejections?: string[];
  approved?: boolean;
  rejected?: boolean;
  downloadAllowed?: boolean;
};

type RadarrBlocklist = {
  id: number;
  sourceTitle?: string;
  date?: string;
};

function mapReleaseQuality(raw: RadarrRelease["quality"]): MovieReleaseQuality | undefined {
  const q = raw?.quality;
  if (q?.id == null || !q.name) return undefined;
  return {
    quality: {
      id: q.id,
      name: q.name,
      source: q.source,
      resolution: q.resolution,
      modifier: q.modifier,
    },
    revision: {
      version: raw?.revision?.version ?? 1,
      real: raw?.revision?.real ?? 0,
      isRepack: raw?.revision?.isRepack ?? false,
    },
  };
}

function mapReleaseLanguages(
  languages: RadarrRelease["languages"],
): MovieReleaseLanguage[] {
  return (languages ?? [])
    .filter((l): l is { id: number; name: string } => l.id != null && Boolean(l.name))
    .map((l) => ({ id: l.id, name: l.name }));
}

function mapIndexerFlags(flags: RadarrRelease["indexerFlags"]): string[] {
  if (Array.isArray(flags)) {
    return flags.map(String).filter(Boolean);
  }
  return [];
}

function toMovieRelease(record: RadarrRelease): MovieRelease | null {
  if (!record.guid || record.indexerId == null) return null;
  const protocolParsed = MovieReleaseProtocolSchema.safeParse(record.protocol);
  const quality = mapReleaseQuality(record.quality);
  return {
    guid: record.guid,
    protocol: protocolParsed.success ? protocolParsed.data : "unknown",
    age: record.age ?? 0,
    ageHours: record.ageHours ?? 0,
    ageMinutes: record.ageMinutes ?? 0,
    publishDate: record.publishDate,
    title: record.title ?? "",
    infoUrl: record.infoUrl || undefined,
    indexerId: record.indexerId,
    indexer: record.indexer ?? "",
    size: record.size,
    seeders: record.seeders,
    leechers: record.leechers,
    quality,
    qualityName: quality?.quality.name,
    languages: mapReleaseLanguages(record.languages),
    customFormats: (record.customFormats ?? [])
      .map((f) => f.name)
      .filter((n): n is string => Boolean(n)),
    customFormatScore: record.customFormatScore ?? 0,
    indexerFlags: mapIndexerFlags(record.indexerFlags),
    rejections: record.rejections ?? [],
    approved: Boolean(record.approved),
    rejected: Boolean(record.rejected) || (record.rejections?.length ?? 0) > 0,
    downloadAllowed: Boolean(record.downloadAllowed),
  };
}

function requireInstance(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId && i.kind === "radarr");
  if (!instance) {
    throw new Error(`Radarr instance not found: ${instanceId}`);
  }
  return instance;
}

function parseMinimumAvailability(value: string | undefined): MovieMinimumAvailability {
  const parsed = MovieMinimumAvailabilitySchema.safeParse(value);
  return parsed.success ? parsed.data : "announced";
}

function availabilityFor(movie: RadarrMovie): Availability {
  return moviePosterStatus({
    hasFile: Boolean(movie.hasFile),
    monitored: movie.monitored,
    isAvailable: Boolean(movie.isAvailable),
    status: movie.status,
  });
}

function mediaCoverUrl(instance: Instance, image: RadarrImage | undefined): string | undefined {
  if (!image) return undefined;
  if (image.url?.startsWith("/")) {
    const raw = image.url.split("?")[0] ?? image.url;
    const path =
      image.coverType === "poster" ? toGridPosterPath(raw) : raw;
    return `/api/media/${encodeURIComponent(instance.id)}/image?path=${encodeURIComponent(path)}`;
  }
  return image.remoteUrl ?? undefined;
}

function mapLookupItem(instance: Instance, movie: RadarrMovie & { tmdbId: number }): MovieLookupItem {
  const poster = movie.images?.find((img) => img.coverType === "poster");
  const inLibrary = typeof movie.id === "number" && movie.id > 0;
  return {
    tmdbId: movie.tmdbId,
    title: movie.title,
    year: movie.year,
    overview: movie.overview,
    runtime: movie.runtime,
    certification: movie.certification,
    genres: movie.genres ?? [],
    studio: movie.studio,
    originalLanguage: movie.originalLanguage?.name,
    posterUrl: mediaCoverUrl(instance, poster),
    tmdbRating: movie.ratings?.tmdb?.value,
    imdbRating: movie.ratings?.imdb?.value,
    tomatoRating: movie.ratings?.rottenTomatoes?.value,
    folder: movie.folder,
    inLibrary,
    ...(inLibrary ? { externalId: movie.id } : {}),
  };
}

function toEditDetail(instanceId: string, movie: RadarrMovie): MovieDetail {
  return {
    instanceId,
    externalId: movie.id,
    title: movie.title,
    year: movie.year,
    monitored: movie.monitored,
    minimumAvailability: parseMinimumAvailability(movie.minimumAvailability),
    qualityProfileId: movie.qualityProfileId,
    path: movie.path ?? "",
    tagIds: movie.tags ?? [],
    tmdbId: movie.tmdbId,
    imdbId: movie.imdbId,
    youTubeTrailerId: movie.youTubeTrailerId,
  };
}

function mapMovieFile(file: RadarrMovieFile): MovieFile {
  const audioCodec = file.mediaInfo?.audioCodec;
  const channels = file.mediaInfo?.audioChannels;
  const audioInfo =
    audioCodec && channels != null
      ? `${audioCodec} ${channels}`
      : audioCodec ?? file.mediaInfo?.audioLanguages ?? undefined;

  return {
    id: file.id,
    relativePath: file.relativePath ?? "",
    size: file.size,
    videoCodec: file.mediaInfo?.videoCodec,
    audioInfo,
    languages: (file.languages ?? []).map((l) => l.name).filter((n): n is string => Boolean(n)),
    quality: file.quality?.quality?.name,
    releaseGroup: file.releaseGroup,
    customFormats: (file.customFormats ?? [])
      .map((f) => f.name)
      .filter((n): n is string => Boolean(n)),
    customFormatScore: file.customFormatScore,
  };
}

function mapManageFileQuality(file: RadarrMovieFile): MovieReleaseQuality | undefined {
  const q = file.quality?.quality;
  if (q?.id == null || !q.name) return undefined;
  return {
    quality: {
      id: q.id,
      name: q.name,
      source: q.source,
      resolution: q.resolution,
      modifier: q.modifier,
    },
    revision: {
      version: file.quality?.revision?.version ?? 1,
      real: file.quality?.revision?.real ?? 0,
      isRepack: file.quality?.revision?.isRepack ?? false,
    },
  };
}

function mapManageFile(file: RadarrMovieFile): MovieManageFile {
  return {
    id: file.id,
    relativePath: file.relativePath ?? "",
    size: file.size,
    releaseGroup: file.releaseGroup,
    quality: mapManageFileQuality(file),
    languages: (file.languages ?? [])
      .filter((l): l is { id: number; name: string } => l.id != null && Boolean(l.name))
      .map((l) => ({ id: l.id, name: l.name })),
    indexerFlags: file.indexerFlags ?? 0,
    customFormatScore: file.customFormatScore,
  };
}

function flattenQualitySchema(items: RadarrQualitySchemaItem[]): MovieQualityOption[] {
  const out: MovieQualityOption[] = [];
  const seen = new Set<number>();

  const walk = (nodes: unknown) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes as RadarrQualitySchemaItem[]) {
      const q = node.quality;
      if (q?.id != null && q.name && !seen.has(q.id)) {
        seen.add(q.id);
        out.push({
          id: q.id,
          name: q.name,
          source: q.source,
          resolution: q.resolution,
          modifier: q.modifier,
        });
      }
      if (node.items?.length) walk(node.items);
    }
  };

  walk(items);
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function mapExtraFile(file: RadarrExtraFile): MovieExtraFile {
  return {
    id: file.id,
    relativePath: file.relativePath ?? "",
    extension: file.extension,
    type: file.type ?? "other",
  };
}

function mapCredit(instance: Instance, credit: RadarrCredit): MovieCredit | null {
  if (credit.type !== "cast" && credit.type !== "crew") return null;
  const headshot = credit.images?.find((img) => img.coverType === "headshot" || img.coverType === "poster");
  return {
    id: credit.id,
    type: credit.type,
    personName: credit.personName ?? "Unknown",
    character: credit.character,
    job: credit.job,
    order: credit.order,
    personTmdbId: credit.personTmdbId,
    headshotUrl: mediaCoverUrl(instance, headshot ?? credit.images?.[0]),
  };
}

function mapAltTitle(title: RadarrAltTitle): MovieAlternativeTitle | null {
  if (!title.title) return null;
  return {
    id: title.id,
    title: title.title,
    sourceType: title.sourceType ?? "tmdb",
  };
}

export async function fetchMovieEditOptions(
  instances: Instance[],
  instanceId: string,
): Promise<MovieEditOptions> {
  const instance = requireInstance(instances, instanceId);
  const [qualityProfiles, tags, rootFolders] = await Promise.all([
    arrJson<QualityProfile[]>(instance, "/api/v3/qualityprofile"),
    arrJson<ArrTag[]>(instance, "/api/v3/tag"),
    arrJson<ArrRootFolder[]>(instance, "/api/v3/rootfolder"),
  ]);
  return {
    qualityProfiles: qualityProfiles.map((p) => ({ id: p.id, name: p.name })),
    tags: tags.map((t) => ({ id: t.id, label: t.label })),
    rootFolders: rootFolders.map((r) => ({
      id: r.id,
      path: r.path,
      ...(typeof r.freeSpace === "number" ? { freeSpace: r.freeSpace } : {}),
    })),
  };
}

export async function fetchMovieDetail(
  instances: Instance[],
  instanceId: string,
  movieId: number,
): Promise<MoviePageDetail> {
  const instance = requireInstance(instances, instanceId);
  const [movie, profiles, files, extraFiles, credits, altTitles] = await Promise.all([
    arrJson<RadarrMovie>(instance, `/api/v3/movie/${movieId}`),
    arrJson<QualityProfile[]>(instance, "/api/v3/qualityprofile").catch(() => [] as QualityProfile[]),
    arrJson<RadarrMovieFile[]>(instance, `/api/v3/moviefile?movieId=${movieId}`).catch(
      () => [] as RadarrMovieFile[],
    ),
    arrJson<RadarrExtraFile[]>(instance, `/api/v3/extrafile?movieId=${movieId}`).catch(
      () => [] as RadarrExtraFile[],
    ),
    arrJson<RadarrCredit[]>(instance, `/api/v3/credit?movieId=${movieId}`).catch(
      () => [] as RadarrCredit[],
    ),
    arrJson<RadarrAltTitle[]>(instance, `/api/v3/alttitle?movieId=${movieId}`).catch(
      () => [] as RadarrAltTitle[],
    ),
  ]);

  const profileName = profiles.find((p) => p.id === movie.qualityProfileId)?.name;
  const poster = movie.images?.find((img) => img.coverType === "poster");
  const fanart = movie.images?.find((img) => img.coverType === "fanart");
  const mappedCredits = credits
    .map((c) => mapCredit(instance, c))
    .filter((c): c is MovieCredit => c != null)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const edit = toEditDetail(instanceId, movie);
  return {
    ...edit,
    overview: movie.overview,
    runtime: movie.runtime,
    genres: movie.genres ?? [],
    studio: movie.studio,
    certification: movie.certification,
    originalLanguage: movie.originalLanguage?.name,
    collection: movie.collection?.title ?? movie.collection?.name,
    qualityProfileName: profileName,
    hasFile: Boolean(movie.hasFile),
    sizeOnDisk: movie.sizeOnDisk,
    availability: availabilityFor(movie),
    tmdbRating: movie.ratings?.tmdb?.value,
    imdbRating: movie.ratings?.imdb?.value,
    tomatoRating: movie.ratings?.rottenTomatoes?.value,
    traktRating: movie.ratings?.trakt?.value,
    posterUrl: mediaCoverUrl(instance, poster),
    fanartUrl: mediaCoverUrl(instance, fanart),
    files: files.map(mapMovieFile),
    extraFiles: extraFiles.map(mapExtraFile),
    cast: mappedCredits.filter((c) => c.type === "cast"),
    crew: mappedCredits.filter((c) => c.type === "crew"),
    alternativeTitles: altTitles
      .map(mapAltTitle)
      .filter((t): t is MovieAlternativeTitle => t != null),
  };
}

export async function refreshMovie(
  instances: Instance[],
  instanceId: string,
  movieId: number,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v3/command", {
    method: "POST",
    body: { name: "RefreshMovie", movieIds: [movieId] },
  });
}

export async function searchMovie(
  instances: Instance[],
  instanceId: string,
  movieId: number,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v3/command", {
    method: "POST",
    body: { name: "MoviesSearch", movieIds: [movieId] },
  });
}

function parseHistoryEventType(value: string | undefined): MovieHistoryEventType {
  const parsed = MovieHistoryEventTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : "unknown";
}

export async function fetchMovieHistory(
  instances: Instance[],
  instanceId: string,
  movieId: number,
): Promise<MovieHistoryEvent[]> {
  const instance = requireInstance(instances, instanceId);
  const records = await arrJson<RadarrHistory[]>(
    instance,
    `/api/v3/history/movie?movieId=${movieId}`,
  );

  return records
    .map((record): MovieHistoryEvent => {
      const data: Record<string, string> = {};
      for (const [key, value] of Object.entries(record.data ?? {})) {
        if (value != null && value !== "") data[key] = value;
      }
      return {
        id: record.id,
        eventType: parseHistoryEventType(record.eventType),
        sourceTitle: record.sourceTitle ?? "",
        languages: (record.languages ?? [])
          .map((l) => l.name)
          .filter((n): n is string => Boolean(n)),
        quality: record.quality?.quality?.name,
        customFormats: (record.customFormats ?? [])
          .map((f) => f.name)
          .filter((n): n is string => Boolean(n)),
        customFormatScore: record.customFormatScore,
        date: record.date ?? "",
        downloadId: record.downloadId || undefined,
        data,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Radarr: POST /api/v3/history/failed/{id} — mark a grabbed history item as failed. */
export async function markMovieHistoryFailed(
  instances: Instance[],
  instanceId: string,
  historyId: number,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, `/api/v3/history/failed/${historyId}`, {
    method: "POST",
  });
}

/** Interactive search — long-running; queries all interactive indexers. */
export async function fetchMovieReleases(
  instances: Instance[],
  instanceId: string,
  movieId: number,
): Promise<MovieRelease[]> {
  const instance = requireInstance(instances, instanceId);
  const records = await arrJson<RadarrRelease[]>(
    instance,
    `/api/v3/release?movieId=${movieId}`,
    { timeoutMs: 120_000 },
  );
  return records
    .map(toMovieRelease)
    .filter((r): r is MovieRelease => r != null);
}

export async function grabMovieRelease(
  instances: Instance[],
  instanceId: string,
  request: MovieReleaseGrabRequest,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  const body: Record<string, unknown> = {
    guid: request.guid,
    indexerId: request.indexerId,
  };
  if (request.movieId != null) body.movieId = request.movieId;
  if (request.shouldOverride) {
    if (request.movieId == null || !request.quality || !request.languages) {
      throw new Error("Override grab requires movieId, quality, and languages");
    }
    body.shouldOverride = true;
    body.quality = request.quality;
    body.languages = request.languages;
  }
  await arrJson(instance, "/api/v3/release", {
    method: "POST",
    body,
    timeoutMs: 60_000,
  });
}

export async function fetchMovieBlocklist(
  instances: Instance[],
  instanceId: string,
  movieId: number,
): Promise<MovieBlocklistItem[]> {
  const instance = requireInstance(instances, instanceId);
  const records = await arrJson<RadarrBlocklist[]>(
    instance,
    `/api/v3/blocklist/movie?movieId=${movieId}`,
  );
  return records.map((record) => ({
    id: record.id,
    sourceTitle: record.sourceTitle ?? "",
    date: record.date ?? "",
  }));
}

type RadarrRenamePreview = {
  movieId?: number;
  movieFileId?: number;
  existingPath?: string;
  newPath?: string;
};

type RadarrNamingConfig = {
  renameMovies?: boolean;
  standardMovieFormat?: string;
};

export async function fetchMovieRenamePreview(
  instances: Instance[],
  instanceId: string,
  movieId: number,
): Promise<MovieRenamePreview[]> {
  const instance = requireInstance(instances, instanceId);
  const records = await arrJson<RadarrRenamePreview[]>(
    instance,
    `/api/v3/rename?movieId=${movieId}`,
  );
  return records
    .filter(
      (r): r is RadarrRenamePreview & { movieId: number; movieFileId: number } =>
        r.movieId != null && r.movieFileId != null,
    )
    .map((r) => ({
      movieId: r.movieId,
      movieFileId: r.movieFileId,
      existingPath: r.existingPath ?? "",
      newPath: r.newPath ?? "",
    }));
}

export async function fetchMovieNamingConfig(
  instances: Instance[],
  instanceId: string,
): Promise<MovieNamingConfig> {
  const instance = requireInstance(instances, instanceId);
  const config = await arrJson<RadarrNamingConfig>(instance, "/api/v3/config/naming");
  return {
    renameMovies: Boolean(config.renameMovies),
    standardMovieFormat: config.standardMovieFormat ?? "",
  };
}

/** Detail-modal organize: RenameFiles for selected movie file IDs. */
export async function organizeMovieFiles(
  instances: Instance[],
  instanceId: string,
  movieId: number,
  files: number[],
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  if (files.length === 0) {
    throw new Error("No files selected to organize");
  }
  await arrJson(instance, "/api/v3/command", {
    method: "POST",
    body: { name: "RenameFiles", movieId, files },
  });
}

export async function fetchMovieManageFiles(
  instances: Instance[],
  instanceId: string,
  movieId: number,
): Promise<MovieManageFile[]> {
  const instance = requireInstance(instances, instanceId);
  const files = await arrJson<RadarrMovieFile[]>(
    instance,
    `/api/v3/moviefile?movieId=${movieId}`,
  );
  return files.map(mapManageFile);
}

export async function fetchMovieQualities(
  instances: Instance[],
  instanceId: string,
): Promise<MovieQualityOption[]> {
  const instance = requireInstance(instances, instanceId);
  // Radarr returns a single QualityProfileResource template, not an array.
  const schema = await arrJson<{ items?: RadarrQualitySchemaItem[] }>(
    instance,
    "/api/v3/qualityprofile/schema",
  );
  return flattenQualitySchema(schema.items ?? []);
}

export async function fetchMovieLanguages(
  instances: Instance[],
  instanceId: string,
): Promise<MovieLanguageOption[]> {
  const instance = requireInstance(instances, instanceId);
  const languages = await arrJson<Array<{ id?: number; name?: string }>>(
    instance,
    "/api/v3/language",
  );
  return languages
    .filter(
      (l): l is { id: number; name: string } =>
        l.id != null &&
        Boolean(l.name) &&
        l.id !== -1 &&
        l.id !== -2 &&
        l.name !== "Any" &&
        l.name !== "Original",
    )
    .map((l) => ({ id: l.id, name: l.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchMovieIndexerFlags(
  instances: Instance[],
  instanceId: string,
): Promise<MovieIndexerFlagOption[]> {
  const instance = requireInstance(instances, instanceId);
  const flags = await arrJson<Array<{ id?: number; name?: string }>>(
    instance,
    "/api/v3/indexerFlag",
  );
  return flags
    .filter((f): f is { id: number; name: string } => f.id != null && Boolean(f.name))
    .map((f) => ({ id: f.id, name: f.name }));
}

export async function bulkUpdateMovieFiles(
  instances: Instance[],
  instanceId: string,
  files: MovieFileBulkUpdateItem[],
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v3/moviefile/bulk", {
    method: "PUT",
    body: files.map((f) => ({
      id: f.id,
      quality: f.quality,
      languages: f.languages,
      releaseGroup: f.releaseGroup ?? "",
      indexerFlags: f.indexerFlags,
    })),
  });
}

export async function bulkDeleteMovieFiles(
  instances: Instance[],
  instanceId: string,
  movieFileIds: number[],
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v3/moviefile/bulk", {
    method: "DELETE",
    body: { movieFileIds },
  });
}

export async function updateMovie(
  instances: Instance[],
  instanceId: string,
  movieId: number,
  patch: MovieUpdateRequest,
): Promise<MovieDetail> {
  const instance = requireInstance(instances, instanceId);
  const current = await arrJson<RadarrMovie>(instance, `/api/v3/movie/${movieId}`);
  const next: RadarrMovie = {
    ...current,
    monitored: patch.monitored,
    minimumAvailability: patch.minimumAvailability,
    qualityProfileId: patch.qualityProfileId,
    path: patch.path,
    tags: patch.tagIds,
  };
  const saved = await arrJson<RadarrMovie>(instance, `/api/v3/movie/${movieId}`, {
    method: "PUT",
    body: next,
  });
  return toEditDetail(instanceId, saved);
}

export async function deleteMovie(
  instances: Instance[],
  instanceId: string,
  movieId: number,
  deleteFiles = false,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(
    instance,
    `/api/v3/movie/${movieId}?deleteFiles=${deleteFiles ? "true" : "false"}&addImportExclusion=false`,
    { method: "DELETE" },
  );
}

export async function lookupMovies(
  instances: Instance[],
  instanceId: string,
  term: string,
): Promise<MovieLookupItem[]> {
  const instance = requireInstance(instances, instanceId);
  const trimmed = term.trim();
  if (!trimmed) return [];
  const results = await arrJson<RadarrMovie[]>(
    instance,
    `/api/v3/movie/lookup?term=${encodeURIComponent(trimmed)}`,
    { timeoutMs: 20_000 },
  );
  return results
    .filter((movie): movie is RadarrMovie & { tmdbId: number } =>
      typeof movie.tmdbId === "number" && movie.tmdbId > 0,
    )
    .map((movie) => mapLookupItem(instance, movie));
}

export async function addMovie(
  instances: Instance[],
  instanceId: string,
  request: MovieAddRequest,
): Promise<MovieDetail> {
  const instance = requireInstance(instances, instanceId);
  const lookup = await arrJson<RadarrMovie[]>(
    instance,
    `/api/v3/movie/lookup?term=${encodeURIComponent(`tmdb:${request.tmdbId}`)}`,
    { timeoutMs: 20_000 },
  );
  const seed = lookup.find((movie) => movie.tmdbId === request.tmdbId) ?? lookup[0];
  if (!seed) {
    throw new Error(`Movie not found for TMDb ${request.tmdbId}`);
  }
  if (typeof seed.id === "number" && seed.id > 0) {
    const err = new Error("Movie is already in the library") as Error & { existingId?: number };
    err.existingId = seed.id;
    throw err;
  }

  const { id: _ignoredId, ...withoutId } = seed;
  void _ignoredId;
  const body: Record<string, unknown> = {
    ...withoutId,
    qualityProfileId: request.qualityProfileId,
    rootFolderPath: request.rootFolderPath,
    monitored: request.monitored,
    minimumAvailability: request.minimumAvailability,
    tags: request.tagIds,
    addOptions: {
      searchForMovie: request.searchForMovie,
      monitor: request.monitored ? "movieOnly" : "none",
    },
  };
  if (request.path) {
    body.path = request.path;
  }

  const saved = await arrJson<RadarrMovie>(instance, "/api/v3/movie", {
    method: "POST",
    body,
  });
  return toEditDetail(instanceId, saved);
}

/**
 * Mirror Radarr's MovieDetailsLinks UI.
 * Radarr has no links API — the UI builds these from movie.tmdbId / imdbId / youTubeTrailerId.
 * Source: https://github.com/Radarr/Radarr/blob/develop/frontend/src/Movie/Details/MovieDetailsLinks.tsx
 */
export function buildMovieLinks(detail: MovieDetail): MovieLink[] {
  type LinkDraft = MovieLink & { hasExternalId: boolean };
  const links: LinkDraft[] = [];

  if (detail.tmdbId) {
    links.push({
      id: "tmdb",
      label: "TMDb",
      url: `https://www.themoviedb.org/movie/${detail.tmdbId}`,
      hasExternalId: true,
    });
    links.push({
      id: "letterboxd",
      label: "Letterboxd",
      url: `https://letterboxd.com/tmdb/${detail.tmdbId}`,
      hasExternalId: false,
    });
  }

  if (detail.imdbId) {
    links.push({
      id: "imdb",
      label: "IMDb",
      url: `https://imdb.com/title/${detail.imdbId}/`,
      hasExternalId: true,
    });
    links.push({
      id: "trakt",
      label: "Trakt",
      url: `https://trakt.tv/movies/${detail.imdbId}`,
      hasExternalId: false,
    });
    links.push({
      id: "moviechat",
      label: "Movie Chat",
      url: `https://moviechat.org/${detail.imdbId}/`,
      hasExternalId: false,
    });
    links.push({
      id: "mdblist",
      label: "MDBList",
      url: `https://mdblist.com/movie/${detail.imdbId}`,
      hasExternalId: false,
    });
    links.push({
      id: "bluray",
      label: "Blu-ray",
      url: `https://www.blu-ray.com/search/?quicksearch=1&quicksearch_keyword=${encodeURIComponent(detail.imdbId)}&section=theatrical`,
      hasExternalId: false,
    });
  }

  if (detail.youTubeTrailerId) {
    links.push({
      id: "trailer",
      label: "Trailer",
      url: `https://www.youtube.com/watch?v=${detail.youTubeTrailerId}`,
      hasExternalId: false,
    });
  }

  return links
    .sort((a, b) => Number(!a.hasExternalId) - Number(!b.hasExternalId))
    .map(({ hasExternalId: _hasExternalId, ...link }) => link);
}
