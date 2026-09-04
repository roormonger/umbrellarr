import type { Instance, InstanceStatus } from "@umbrellarr/shared";

export async function checkInstanceStatus(instance: Instance): Promise<InstanceStatus> {
  const base = {
    id: instance.id,
    name: instance.name,
    kind: instance.kind,
    baseUrl: instance.baseUrl,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const statusPath =
      instance.kind === "seerr"
        ? "/api/v1/status"
        : instance.kind === "lidarr" || instance.kind === "prowlarr"
          ? "/api/v1/system/status"
          : "/api/v3/system/status";
    const res = await fetch(`${instance.baseUrl}${statusPath}`, {
      headers: {
        "X-Api-Key": instance.apiKey ?? "",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ...base, online: false, error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as { version?: string };
    return { ...base, online: true, version: data.version };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return { ...base, online: false, error: message };
  }
}
