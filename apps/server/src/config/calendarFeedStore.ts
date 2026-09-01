import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { CalendarFeedSettings } from "@umbrellarr/shared";
import type { AppDatabase } from "../db/client.js";
import { metaTable } from "../db/schema.js";

const FEED_TOKEN_KEY = "calendar_feed_token";

export class CalendarFeedStore {
  constructor(private readonly db: AppDatabase) {}

  getToken(): string | undefined {
    const row = this.db
      .select()
      .from(metaTable)
      .where(eq(metaTable.key, FEED_TOKEN_KEY))
      .get();
    return row?.value || undefined;
  }

  /** Ensure a token exists; create one if missing. */
  ensureToken(): string {
    const existing = this.getToken();
    if (existing) return existing;
    return this.regenerate();
  }

  regenerate(): string {
    const token = randomBytes(32).toString("hex");
    this.db
      .insert(metaTable)
      .values({ key: FEED_TOKEN_KEY, value: token })
      .onConflictDoUpdate({
        target: metaTable.key,
        set: { value: token },
      })
      .run();
    return token;
  }

  getSettings(): CalendarFeedSettings {
    const feedToken = this.getToken();
    if (!feedToken) {
      return { hasToken: false };
    }
    return {
      hasToken: true,
      feedToken,
      feedPath: `/api/calendar.ics?token=${encodeURIComponent(feedToken)}`,
    };
  }

  tokenMatches(candidate: string | undefined): boolean {
    if (!candidate) return false;
    const stored = this.getToken();
    return Boolean(stored && stored === candidate);
  }
}
