import type {
  ArtistDetail,
  ArtistEditOptions,
  ArtistLink,
  ArtistListItem,
  ArtistUpdateRequest,
  CacheStatus,
} from "@umbrellarr/shared";
import { api } from "./client";

export type ArtistsResponse = {
  artists: ArtistListItem[];
  count: number;
  cache?: CacheStatus;
  fetchedAt?: string;
};

export function listArtists(instanceId?: string, options?: { refresh?: boolean }) {
  const params = new URLSearchParams();
  if (instanceId) params.set("instanceId", instanceId);
  if (options?.refresh) params.set("refresh", "true");
  const encoded = params.toString();
  const query = encoded ? `?${encoded}` : "";
  return api<ArtistsResponse>(`/api/artists${query}`);
}

export function getArtistDetail(instanceId: string, artistId: number) {
  return api<ArtistDetail>(`/api/artists/${encodeURIComponent(instanceId)}/${artistId}`);
}

export function getArtistEditOptions(instanceId: string) {
  return api<ArtistEditOptions>(`/api/artists/${encodeURIComponent(instanceId)}/options`);
}

export function getArtistLinks(instanceId: string, artistId: number) {
  return api<{ links: ArtistLink[] }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/links`,
  );
}

export function refreshArtist(instanceId: string, artistId: number) {
  return api<{ ok: true }>(
    `/api/artists/${encodeURIComponent(instanceId)}/${artistId}/refresh`,
    { method: "POST" },
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
