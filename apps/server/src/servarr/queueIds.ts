import type { Instance } from "@umbrellarr/shared";
import { arrJson } from "./client.js";

type QueuePage = {
  records?: Array<Record<string, unknown>>;
  totalRecords?: number;
};

/** Collect entity ids currently in Arr's activity queue (for poster “downloading/queued”). */
export async function fetchQueueEntityIds(
  instance: Instance,
  idField: "movieId" | "seriesId" | "artistId",
): Promise<Set<number>> {
  const apiBase = instance.kind === "lidarr" ? "/api/v1" : "/api/v3";
  const ids = new Set<number>();
  let page = 1;

  try {
    for (;;) {
      const data = await arrJson<QueuePage>(
        instance,
        `${apiBase}/queue?page=${page}&pageSize=500`,
      );
      for (const record of data.records ?? []) {
        const id = record[idField];
        if (typeof id === "number") ids.add(id);
      }
      const total = data.totalRecords ?? 0;
      const seen = (page - 1) * 500 + (data.records?.length ?? 0);
      if ((data.records?.length ?? 0) === 0 || seen >= total || page > 20) break;
      page += 1;
    }
  } catch (error) {
    console.warn(`[queue] lookup failed for ${instance.id}`, error);
  }

  return ids;
}
