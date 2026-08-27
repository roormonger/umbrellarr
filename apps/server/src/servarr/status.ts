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
    const res = await fetch(`${instance.baseUrl}/api/v3/system/status`, {
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
