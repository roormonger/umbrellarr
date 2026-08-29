import type { QueryClient } from "@tanstack/react-query";
import type { AuthStatus } from "@umbrellarr/shared";
import { api } from "./client";

export const AUTH_STATUS_QUERY_KEY = ["auth", "status"] as const;

/** Keep navigations from re-hitting /api/auth/status on every sidebar click. */
export const AUTH_STATUS_STALE_MS = 5 * 60_000;

export function getAuthStatus() {
  return api<AuthStatus>("/api/auth/status");
}

export function ensureAuthStatus(queryClient: QueryClient) {
  return queryClient.ensureQueryData({
    queryKey: AUTH_STATUS_QUERY_KEY,
    queryFn: getAuthStatus,
    staleTime: AUTH_STATUS_STALE_MS,
  });
}

export function setAuthStatusCache(queryClient: QueryClient, status: AuthStatus) {
  queryClient.setQueryData(AUTH_STATUS_QUERY_KEY, status);
}

export function clearAuthStatusCache(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
}

export function login(password: string) {
  return api<{ ok: boolean }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function logout() {
  return api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}
