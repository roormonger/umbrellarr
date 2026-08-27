import type { DashboardStats } from "@umbrellarr/shared";
import { api } from "./client";

export function getDashboardStats() {
  return api<DashboardStats>("/api/stats");
}
