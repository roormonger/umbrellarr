export type SyncRevision = {
  library: number;
  queue: number;
  history: number;
  requests: number;
  issues: number;
};

/**
 * Monotonic revision counters. UI polls these and invalidates React Query
 * only when a counter increases.
 */
class SyncRevisionStore {
  private revision: SyncRevision = {
    library: 0,
    queue: 0,
    history: 0,
    requests: 0,
    issues: 0,
  };

  get(): SyncRevision {
    return { ...this.revision };
  }

  bump(keys: Array<keyof SyncRevision>): SyncRevision {
    for (const key of keys) {
      this.revision[key] += 1;
    }
    return this.get();
  }
}

export const syncRevisionStore = new SyncRevisionStore();
