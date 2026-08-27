import type { InstancePublic, InstanceStatus } from "@umbrellarr/shared";
import { api } from "./client";

export function listInstances() {
  return api<{ instances: InstancePublic[] }>("/api/instances");
}

export function getInstanceStatuses() {
  return api<{ statuses: InstanceStatus[] }>("/api/instances/status");
}
