import type { SyncRevision } from "@umbrellarr/shared";
import { SyncRevisionSchema } from "@umbrellarr/shared";
import { api } from "./client";

export function getSyncRevision() {
  return api<SyncRevision>("/api/sync/revision").then((data) => SyncRevisionSchema.parse(data));
}
