import type { AppearanceSettings, AppearanceUpdateRequest } from "@umbrellarr/shared";
import { api } from "./client";

export function getAppearance() {
  return api<AppearanceSettings>("/api/settings/appearance");
}

export function updateAppearance(body: AppearanceUpdateRequest) {
  return api<AppearanceSettings>("/api/settings/appearance", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
