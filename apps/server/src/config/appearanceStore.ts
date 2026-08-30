import { eq } from "drizzle-orm";
import {
  DEFAULT_HIGHLIGHT_COLOR,
  HighlightColorSchema,
  type AppearanceSettings,
} from "@umbrellarr/shared";
import type { AppDatabase } from "../db/client.js";
import { metaTable } from "../db/schema.js";

const HIGHLIGHT_KEY = "highlight_color";

export class AppearanceStore {
  constructor(private readonly db: AppDatabase) {}

  get(): AppearanceSettings {
    const row = this.db
      .select()
      .from(metaTable)
      .where(eq(metaTable.key, HIGHLIGHT_KEY))
      .get();

    if (!row?.value) {
      return { highlightColor: DEFAULT_HIGHLIGHT_COLOR };
    }

    const parsed = HighlightColorSchema.safeParse(row.value);
    if (!parsed.success) {
      return { highlightColor: DEFAULT_HIGHLIGHT_COLOR };
    }

    return { highlightColor: parsed.data.toUpperCase() };
  }

  set(highlightColor: string): AppearanceSettings {
    const normalized = HighlightColorSchema.parse(highlightColor).toUpperCase();
    this.db
      .insert(metaTable)
      .values({ key: HIGHLIGHT_KEY, value: normalized })
      .onConflictDoUpdate({
        target: metaTable.key,
        set: { value: normalized },
      })
      .run();
    return { highlightColor: normalized };
  }
}
