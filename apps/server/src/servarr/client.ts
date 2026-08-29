import type { Instance } from "@umbrellarr/shared";

export async function arrFetch(
  instance: Instance,
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = 15_000, ...rest } = init ?? {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${instance.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    return await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        "X-Api-Key": instance.apiKey ?? "",
        Accept: "application/json",
        ...rest.headers,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function arrJson<T>(
  instance: Instance,
  path: string,
  options?: { timeoutMs?: number; method?: string; body?: unknown },
): Promise<T> {
  const { timeoutMs, method, body } = options ?? {};
  const res = await arrFetch(instance, path, {
    timeoutMs,
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new Error(
      `${instance.name} ${method ?? "GET"} ${path} failed: HTTP ${res.status}${detail ? ` ${detail}` : ""}`,
    );
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
