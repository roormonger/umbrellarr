import type {
  InstanceCreateRequest,
  InstancePublic,
  InstanceStatus,
  InstanceTestRequest,
  InstanceTestResult,
  InstanceUpdateRequest,
} from "@umbrellarr/shared";
import { api } from "./client";

export function listInstances() {
  return api<{ instances: InstancePublic[] }>("/api/instances");
}

export function getInstanceStatuses() {
  return api<{ statuses: InstanceStatus[] }>("/api/instances/status");
}

export function createInstance(body: InstanceCreateRequest) {
  return api<{ instance: InstancePublic }>("/api/instances", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateInstance(id: string, body: InstanceUpdateRequest) {
  return api<{ instance: InstancePublic }>(`/api/instances/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteInstance(id: string) {
  return api<{ ok: boolean }>(`/api/instances/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function testInstance(body: InstanceTestRequest) {
  return api<InstanceTestResult>("/api/instances/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
