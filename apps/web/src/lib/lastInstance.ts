import type { InstanceKind, InstancePublic } from "@umbrellarr/shared";

const STORAGE_PREFIX = "umbrellarr.lastInstance.";

export function getLastInstanceId(kind: InstanceKind): string | null {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${kind}`);
  } catch {
    return null;
  }
}

export function setLastInstanceId(kind: InstanceKind, id: string) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${kind}`, id);
  } catch {
    /* ignore quota / private mode */
  }
}

export function pickInstanceId(
  kind: InstanceKind,
  instances: InstancePublic[],
): string | undefined {
  const ofKind = instances.filter((instance) => instance.kind === kind);
  const last = getLastInstanceId(kind);
  if (last && ofKind.some((instance) => instance.id === last)) return last;
  return ofKind[0]?.id;
}
