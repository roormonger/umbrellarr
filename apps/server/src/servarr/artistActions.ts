/**
 * Lidarr artist edit / refresh / links.
 * Links mirror Lidarr ArtistDetailsLinks (MusicBrainz + artist.links from Arr).
 * Source: https://github.com/lidarr/Lidarr/blob/develop/frontend/src/Artist/Details/ArtistDetailsLinks.js
 */
import type {
  ArtistDetail,
  ArtistEditOptions,
  ArtistLink,
  ArtistMonitorNewItems,
  ArtistUpdateRequest,
  Instance,
} from "@umbrellarr/shared";
import { ArtistMonitorNewItemsSchema } from "@umbrellarr/shared";
import { arrJson } from "./client.js";

type LidarrArtist = {
  id: number;
  artistName?: string;
  monitored: boolean;
  monitorNewItems?: string;
  qualityProfileId: number;
  metadataProfileId: number;
  path?: string;
  tags?: number[];
  foreignArtistId?: string;
  links?: Array<{ name?: string; url?: string }>;
  [key: string]: unknown;
};

type QualityProfile = { id: number; name: string };
type MetadataProfile = { id: number; name: string };
type ArrTag = { id: number; label: string };
type ArrRootFolder = { id: number; path: string; freeSpace?: number | null };

function requireInstance(instances: Instance[], instanceId: string): Instance {
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) throw new Error(`Instance ${instanceId} not found`);
  if (instance.kind !== "lidarr") {
    throw new Error(`Instance ${instanceId} is not a Lidarr client`);
  }
  return instance;
}

function parseMonitorNewItems(value: string | undefined): ArtistMonitorNewItems {
  const parsed = ArtistMonitorNewItemsSchema.safeParse(value);
  return parsed.success ? parsed.data : "all";
}

export async function fetchArtistEditOptions(
  instances: Instance[],
  instanceId: string,
): Promise<ArtistEditOptions> {
  const instance = requireInstance(instances, instanceId);
  const [qualityProfiles, metadataProfiles, tags, rootFolders] = await Promise.all([
    arrJson<QualityProfile[]>(instance, "/api/v1/qualityprofile"),
    arrJson<MetadataProfile[]>(instance, "/api/v1/metadataprofile"),
    arrJson<ArrTag[]>(instance, "/api/v1/tag"),
    arrJson<ArrRootFolder[]>(instance, "/api/v1/rootfolder"),
  ]);
  return {
    qualityProfiles: qualityProfiles.map((p) => ({ id: p.id, name: p.name })),
    metadataProfiles: metadataProfiles.map((p) => ({ id: p.id, name: p.name })),
    tags: tags.map((t) => ({ id: t.id, label: t.label })),
    rootFolders: rootFolders.map((r) => ({
      id: r.id,
      path: r.path,
      ...(typeof r.freeSpace === "number" ? { freeSpace: r.freeSpace } : {}),
    })),
  };
}

export async function fetchArtistDetail(
  instances: Instance[],
  instanceId: string,
  artistId: number,
): Promise<ArtistDetail> {
  const instance = requireInstance(instances, instanceId);
  const artist = await arrJson<LidarrArtist>(instance, `/api/v1/artist/${artistId}`);
  return {
    instanceId,
    externalId: artist.id,
    title: artist.artistName ?? "Unknown Artist",
    monitored: Boolean(artist.monitored),
    monitorNewItems: parseMonitorNewItems(artist.monitorNewItems),
    qualityProfileId: artist.qualityProfileId,
    metadataProfileId: artist.metadataProfileId,
    path: artist.path ?? "",
    tagIds: artist.tags ?? [],
    foreignArtistId: artist.foreignArtistId,
  };
}

export async function refreshArtist(
  instances: Instance[],
  instanceId: string,
  artistId: number,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(instance, "/api/v1/command", {
    method: "POST",
    body: { name: "RefreshArtist", artistIds: [artistId] },
  });
}

export async function updateArtist(
  instances: Instance[],
  instanceId: string,
  artistId: number,
  body: ArtistUpdateRequest,
): Promise<ArtistDetail> {
  const instance = requireInstance(instances, instanceId);
  const current = await arrJson<LidarrArtist>(instance, `/api/v1/artist/${artistId}`);
  await arrJson(instance, `/api/v1/artist/${artistId}`, {
    method: "PUT",
    body: {
      ...current,
      monitored: body.monitored,
      monitorNewItems: body.monitorNewItems,
      qualityProfileId: body.qualityProfileId,
      metadataProfileId: body.metadataProfileId,
      path: body.path,
      tags: body.tagIds,
    },
  });
  return fetchArtistDetail(instances, instanceId, artistId);
}

export async function deleteArtist(
  instances: Instance[],
  instanceId: string,
  artistId: number,
  deleteFiles: boolean,
): Promise<void> {
  const instance = requireInstance(instances, instanceId);
  await arrJson(
    instance,
    `/api/v1/artist/${artistId}?deleteFiles=${deleteFiles ? "true" : "false"}&addImportListExclusion=false`,
    { method: "DELETE" },
  );
}

/**
 * Mirror Lidarr ArtistDetailsLinks: MusicBrainz from foreignArtistId, then Arr `links[]`.
 * Source: https://github.com/lidarr/Lidarr/blob/develop/frontend/src/Artist/Details/ArtistDetailsLinks.js
 */
export async function buildArtistLinks(
  instances: Instance[],
  instanceId: string,
  artistId: number,
): Promise<ArtistLink[]> {
  const instance = requireInstance(instances, instanceId);
  const artist = await arrJson<LidarrArtist>(instance, `/api/v1/artist/${artistId}`);
  const links: ArtistLink[] = [];

  if (artist.foreignArtistId) {
    links.push({
      id: "musicbrainz",
      label: "MusicBrainz",
      url: `https://musicbrainz.org/artist/${artist.foreignArtistId}`,
    });
  }

  for (const [index, link] of (artist.links ?? []).entries()) {
    if (!link?.name || !link.url) continue;
    try {
      // Validate URL via constructor; skip malformed Arr entries.
      new URL(link.url);
      links.push({
        id: `arr-${index}-${link.name.toLowerCase().replace(/\s+/g, "-")}`,
        label: link.name,
        url: link.url,
      });
    } catch {
      // ignore invalid
    }
  }

  return links;
}
