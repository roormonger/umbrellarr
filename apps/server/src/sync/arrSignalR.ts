import type { HubConnection } from "@microsoft/signalr";
import { HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import type { Instance } from "@umbrellarr/shared";
import WebSocket from "ws";
import type { LibraryCache } from "../cache/libraryCache.js";
import { activityListCache } from "../cache/ttlCache.js";
import { syncRevisionStore } from "./revisionStore.js";

// Node <22 may lack a global WebSocket; SignalR needs one for Arr hubs.
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as typeof globalThis & { WebSocket: typeof WebSocket }).WebSocket =
    WebSocket as unknown as typeof globalThis.WebSocket;
}

type ArrMessage = {
  name?: string;
  body?: unknown;
};

const LIBRARY_MESSAGE_NAMES = new Set([
  "movie",
  "movies",
  "series",
  "episode",
  "episodes",
  "artist",
  "album",
  "track",
]);

const QUEUE_MESSAGE_NAMES = new Set(["queue", "queue.updated", "download", "command"]);

/**
 * Server-side Arr SignalR clients. Keys stay on the BFF — browsers never connect to Arr hubs.
 */
export class ArrSignalRSync {
  private readonly connections = new Map<string, HubConnection>();
  private readonly instances = new Map<string, Instance>();
  private readonly refreshTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private stopped = false;

  constructor(
    private readonly libraryCache: LibraryCache,
    private readonly options: {
      /** Debounce library refresh after SignalR events. */
      libraryDebounceMs?: number;
      /** Periodic full refresh fallback (missed events / Seerr). */
      pollIntervalMs?: number;
    } = {},
  ) {}

  start(instances: Instance[]): void {
    this.stopped = false;
    const arr = instances.filter(
      (i) => i.kind === "radarr" || i.kind === "sonarr" || i.kind === "lidarr",
    );
    const activeIds = new Set(arr.map((i) => i.id));

    for (const [id, connection] of this.connections) {
      if (!activeIds.has(id)) {
        void connection.stop().catch(() => undefined);
        this.connections.delete(id);
        this.instances.delete(id);
      }
    }

    for (const instance of arr) {
      const previous = this.instances.get(instance.id);
      this.instances.set(instance.id, instance);
      const urlChanged = previous != null && previous.baseUrl !== instance.baseUrl;
      if (urlChanged && this.connections.has(instance.id)) {
        const existing = this.connections.get(instance.id)!;
        this.connections.delete(instance.id);
        void existing.stop().catch(() => undefined);
      }
      if (!this.connections.has(instance.id)) {
        void this.connect(instance.id);
      }
    }

    const pollMs = this.options.pollIntervalMs ?? 12 * 60_000;
    if (!this.pollTimer) {
      this.pollTimer = setInterval(() => {
        if (this.stopped) return;
        this.libraryCache.warm([...this.instances.values()]);
      }, pollMs);
      this.pollTimer.unref?.();
    }
  }

  stop(): void {
    this.stopped = true;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    for (const timer of this.refreshTimers.values()) clearTimeout(timer);
    this.refreshTimers.clear();
    for (const connection of this.connections.values()) {
      void connection.stop().catch(() => undefined);
    }
    this.connections.clear();
    this.instances.clear();
  }

  private async connect(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    const base = instance.baseUrl.replace(/\/+$/, "");
    const url = `${base}/signalr/messages`;
    const connection = new HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => this.instances.get(instanceId)?.apiKey ?? "",
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("receiveMessage", (raw: ArrMessage) => {
      const current = this.instances.get(instanceId);
      if (current) this.handleMessage(current, raw);
    });
    connection.onreconnected(() => {
      const current = this.instances.get(instanceId);
      console.log(`[signalr] reconnected ${current?.kind ?? "?"}/${instanceId}`);
    });
    connection.onclose((error) => {
      if (this.stopped) return;
      console.warn(`[signalr] closed ${instanceId}`, error?.message ?? "no error");
      this.connections.delete(instanceId);
      if (!this.stopped && this.instances.has(instanceId)) {
        setTimeout(() => {
          if (!this.stopped && this.instances.has(instanceId) && !this.connections.has(instanceId)) {
            void this.connect(instanceId);
          }
        }, 5_000).unref?.();
      }
    });

    this.connections.set(instanceId, connection);
    try {
      await connection.start();
      console.log(`[signalr] connected ${instance.kind}/${instanceId}`);
    } catch (error) {
      this.connections.delete(instanceId);
      console.warn(
        `[signalr] failed ${instance.kind}/${instanceId}`,
        error instanceof Error ? error.message : error,
      );
      if (!this.stopped && this.instances.has(instanceId)) {
        setTimeout(() => {
          if (!this.stopped && this.instances.has(instanceId) && !this.connections.has(instanceId)) {
            void this.connect(instanceId);
          }
        }, 15_000).unref?.();
      }
    }
  }

  private handleMessage(instance: Instance, raw: ArrMessage): void {
    const name = String(raw?.name ?? "").toLowerCase();
    if (!name) return;

    if (QUEUE_MESSAGE_NAMES.has(name) || name.includes("queue")) {
      activityListCache.invalidate("queue:");
      activityListCache.invalidate("stats:queue");
      syncRevisionStore.bump(["queue"]);
    }

    if (LIBRARY_MESSAGE_NAMES.has(name)) {
      this.scheduleLibraryRefresh(instance);
    }

    if (name === "command" || name === "history") {
      activityListCache.invalidate("history:");
      activityListCache.invalidate("stats:history");
      syncRevisionStore.bump(["history"]);
    }
  }

  private scheduleLibraryRefresh(instance: Instance): void {
    const existing = this.refreshTimers.get(instance.id);
    if (existing) clearTimeout(existing);
    const delay = this.options.libraryDebounceMs ?? 1_500;
    const timer = setTimeout(() => {
      this.refreshTimers.delete(instance.id);
      const current = this.instances.get(instance.id);
      if (current) void this.refreshLibrary(current);
    }, delay);
    timer.unref?.();
    this.refreshTimers.set(instance.id, timer);
  }

  private async refreshLibrary(instance: Instance): Promise<void> {
    try {
      if (instance.kind === "radarr") {
        await this.libraryCache.refreshMovies(instance);
      } else if (instance.kind === "sonarr") {
        await this.libraryCache.refreshSeries(instance);
      } else if (instance.kind === "lidarr") {
        await this.libraryCache.refreshArtists(instance);
      }
      // revision bump happens via libraryCache.onLibraryUpdated
    } catch (error) {
      console.warn(
        `[signalr] library refresh failed for ${instance.id}`,
        error instanceof Error ? error.message : error,
      );
      this.libraryCache.invalidate(instance.id);
      syncRevisionStore.bump(["library"]);
    }
  }

  isConnected(instanceId: string): boolean {
    const connection = this.connections.get(instanceId);
    return connection?.state === HubConnectionState.Connected;
  }
}
