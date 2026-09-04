import type { IndexerListItem, IndexerPrivacy, IndexerProtocol, IndexerSortKey, IndexerStatusKind } from "@umbrellarr/shared";

export { formatHistoryDate as formatIndexerAdded } from "@/lib/historyDisplay";
export { instanceNameFor } from "@/lib/queueDisplay";

export function indexerItemKey(item: Pick<IndexerListItem, "instanceId" | "id">): string {
  return `${item.instanceId}:${item.id}`;
}

export function protocolLabel(protocol: IndexerProtocol): string {
  return protocol === "usenet" ? "Usenet" : "Torrent";
}

export function privacyLabel(privacy: IndexerPrivacy): string {
  if (privacy === "semiPrivate") return "Semi-Private";
  if (privacy === "private") return "Private";
  return "Public";
}

export function statusLabel(kind: IndexerStatusKind): string {
  if (kind === "enabledRedirected") return "Enabled, redirected";
  if (kind === "disabled") return "Disabled";
  if (kind === "error") return "Error";
  return "Enabled";
}

const STATUS_RANK: Record<IndexerStatusKind, number> = {
  enabled: 0,
  enabledRedirected: 1,
  disabled: 2,
  error: 3,
};

const PROTOCOL_RANK: Record<IndexerProtocol, number> = {
  torrent: 0,
  usenet: 1,
};

const PRIVACY_RANK: Record<IndexerPrivacy, number> = {
  public: 0,
  semiPrivate: 1,
  private: 2,
};

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function compareIndexers(
  a: IndexerListItem,
  b: IndexerListItem,
  sortKey: IndexerSortKey,
  direction: "asc" | "desc",
): number {
  let result = 0;
  switch (sortKey) {
    case "status":
      result = STATUS_RANK[a.statusKind] - STATUS_RANK[b.statusKind];
      break;
    case "added":
      result = (a.added ?? "").localeCompare(b.added ?? "");
      break;
    case "syncProfile":
      result = compareText(a.syncProfile, b.syncProfile);
      break;
    case "priority":
      result = a.priority - b.priority;
      break;
    case "protocol":
      result = PROTOCOL_RANK[a.protocol] - PROTOCOL_RANK[b.protocol];
      break;
    case "privacy":
      result = PRIVACY_RANK[a.privacy] - PRIVACY_RANK[b.privacy];
      break;
    default:
      result = compareText(a.name, b.name);
  }
  if (result === 0 && sortKey !== "name") {
    result = compareText(a.name, b.name);
  }
  return direction === "desc" ? -result : result;
}
