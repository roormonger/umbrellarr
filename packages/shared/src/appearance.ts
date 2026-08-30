import { z } from "zod";

/** Default Umbrellarr violet — matches prior backdrop / brand accent. */
export const DEFAULT_HIGHLIGHT_COLOR = "#7E14FF";

export const HighlightColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Highlight color must be a 6-digit hex like #7E14FF");

export const AppearanceSettingsSchema = z.object({
  highlightColor: HighlightColorSchema,
});
export type AppearanceSettings = z.infer<typeof AppearanceSettingsSchema>;

export const AppearanceUpdateRequestSchema = z.object({
  highlightColor: HighlightColorSchema,
});
export type AppearanceUpdateRequest = z.infer<typeof AppearanceUpdateRequestSchema>;
