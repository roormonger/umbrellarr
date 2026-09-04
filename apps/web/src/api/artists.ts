import type {
  ArtistAlbumTracksResponse,
  ArtistAlbumTypeGroup,
  ArtistAlbumsMonitorRequest,
  ArtistBlocklistItem,
  ArtistDetail,
  ArtistEditOptions,
  ArtistFileBulkDeleteRequest,
  ArtistFileBulkUpdateRequest,
  ArtistHistoryEvent,
  ArtistLink,
  ArtistListItem,
  ArtistManageFile,
  ArtistMonitoringRequest,
  ArtistNamingConfig,
  ArtistOrganizeRequest,
  ArtistPageDetail,
  ArtistQualityOption,
  ArtistRelease,
  ArtistReleaseGrabRequest,
  ArtistRenamePreview,
  ArtistRetagPreview,
  ArtistRetagRequest,
  ArtistUpdateRequest,
  CacheStatus,
} from "@umbrellarr/shared";
import { api } from "./client";

export type ArtistsResponse = {
  artists: ArtistListItem[];
  count: number;
  total?: number;
  truncated?: boolean;
  cache?: CacheStatus;
  fetchedAt?: string;
};

export function listArtists(
  instanceId?: string,
  options?: { refresh?: boolean; limit?: number },
) {
  const params = new URLSearchParams();
  if (instanceId) params.set("instanceId", instanceId);
  if (options?.refresh) params.set("refresh", "true");
  if (options?.limit != null) params.set("limit", String(options.limit));
  const encoded = params.toString();
  const query = encoded ? `?${encoded}` : "";
  return api<ArtistsResponse>(`/api/artists${query}`);
}

export function getArtistDetail(instanceId: string, artistId: number) {
  return api<ArtistPageDetail>(`/api/artists/${encodeURIComponent(instanceId)}/${artistId}`);
}

export function getArtistEditOptions(instanceId: string) {
  return api<ArtistEditOptions>(`/api/artists/${encodeURIComponent(instanceId)}/options`);
}

export function getArtistLinks(instanceId: string, artistId: number) {
  return api<{ links: ArtistLink[] }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/links`,
  );
}

export function getArtistAlbums(instanceId: string, artistId: number) {
  return api<{ groups: ArtistAlbumTypeGroup[] }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/albums`,
  );
}

export function getArtistAlbumTracks(
  instanceId: string,
  artistId: number,
  albumId: number,
) {
  return api<ArtistAlbumTracksResponse>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/albums/${albumId}/tracks`,
  );
}

export function refreshArtist(instanceId: string, artistId: number) {
  return api<{ ok: true }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/refresh`,
    { method: "POST" },
  );
}

export function searchArtist(instanceId: string, artistId: number) {
  return api<{ ok: true }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/search`,
    { method: "POST" },
  );
}

export function searchAlbum(instanceId: string, artistId: number, albumId: number) {
  return api<{ ok: true }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/albums/${albumId}/search`,
    { method: "POST" },
  );
}

export function setAlbumsMonitored(
  instanceId: string,
  artistId: number,
  body: ArtistAlbumsMonitorRequest,
) {
  return api<{ ok: true }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/albums/monitor`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export function updateArtist(instanceId: string, artistId: number, body: ArtistUpdateRequest) {
  return api<ArtistDetail>(`/api/artists/${encodeURIComponent(instanceId)}/${artistId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteArtist(instanceId: string, artistId: number, deleteFiles = false) {
  const q = deleteFiles ? "?deleteFiles=true" : "";
  return api<{ ok: true }>(`/api/artists/${encodeURIComponent(instanceId)}/${artistId}${q}`, {
    method: "DELETE",
  });
}

export function getArtistHistory(instanceId: string, artistId: number) {
  return api<{ events: ArtistHistoryEvent[] }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/history`,
  );
}

export function markArtistHistoryFailed(instanceId: string, historyId: number) {
  return api<{ ok: true }>(
    `/api/artists/${encodeURIComponent(instanceId)}/history/${historyId}/failed`,
    { method: "POST" },
  );
}

export function getArtistReleases(instanceId: string, artistId: number, albumId?: number) {
  const search = albumId != null ? `?albumId=${albumId}` : "";
  return api<{ releases: ArtistRelease[] }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/releases${search}`,
  );
}

export function getArtistBlocklist(instanceId: string, artistId: number) {
  return api<{ items: ArtistBlocklistItem[] }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/blocklist`,
  );
}

export function grabArtistRelease(instanceId: string, body: ArtistReleaseGrabRequest) {
  return api<{ ok: true }>(`/api/artists/${encodeURIComponent(instanceId)}/releases/grab`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getArtistNamingConfig(instanceId: string) {
  return api<ArtistNamingConfig>(`/api/artists/${encodeURIComponent(instanceId)}/naming`);
}

export function getArtistRenamePreview(instanceId: string, artistId: number) {
  return api<{ items: ArtistRenamePreview[] }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/rename`,
  );
}

export function organizeArtistFiles(
  instanceId: string,
  artistId: number,
  body: ArtistOrganizeRequest,
) {
  return api<{ ok: true }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/organize`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function getArtistRetagPreview(instanceId: string, artistId: number) {
  return api<{ items: ArtistRetagPreview[] }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/retag`,
  );
}

export function retagArtistFiles(instanceId: string, artistId: number, body: ArtistRetagRequest) {
  return api<{ ok: true }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/retag`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function updateArtistMonitoring(
  instanceId: string,
  artistId: number,
  body: ArtistMonitoringRequest,
) {
  return api<{ ok: true }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/monitoring`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function getArtistManageFiles(instanceId: string, artistId: number) {
  return api<{ files: ArtistManageFile[] }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/files`,
  );
}

export function getArtistQualities(instanceId: string) {
  return api<{ qualities: ArtistQualityOption[] }>(
    `/api/artists/${encodeURIComponent(instanceId)}/qualities`,
  );
}

export function bulkUpdateArtistFiles(instanceId: string, body: ArtistFileBulkUpdateRequest) {
  return api<{ ok: true }>(`/api/artists/${encodeURIComponent(instanceId)}/files/bulk`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function bulkDeleteArtistFiles(instanceId: string, body: ArtistFileBulkDeleteRequest) {
  return api<{ ok: true }>(`/api/artists/${encodeURIComponent(instanceId)}/files/bulk`, {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}
