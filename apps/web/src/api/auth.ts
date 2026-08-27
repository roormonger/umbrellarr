import type { AuthStatus } from "@umbrellarr/shared";
import { api } from "./client";

export function getAuthStatus() {
  return api<AuthStatus>("/api/auth/status");
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
