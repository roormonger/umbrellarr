import { z } from "zod";
import { AvailabilitySchema } from "./media.js";

export const CalendarEventKindSchema = z.enum(["movie", "episode", "album"]);
export type CalendarEventKind = z.infer<typeof CalendarEventKindSchema>;

export const CalendarMovieReleaseTypeSchema = z.enum([
  "cinema",
  "digital",
  "physical",
  "tba",
]);
export type CalendarMovieReleaseType = z.infer<typeof CalendarMovieReleaseTypeSchema>;

export const CalendarViewSchema = z.enum(["month", "week", "forecast", "day", "agenda"]);
export type CalendarView = z.infer<typeof CalendarViewSchema>;

export const CALENDAR_VIEW_OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "forecast", label: "Forecast" },
  { value: "day", label: "Day" },
  { value: "agenda", label: "Agenda" },
];

export const CalendarEventSchema = z.object({
  id: z.string(),
  kind: CalendarEventKindSchema,
  instanceId: z.string(),
  instanceName: z.string(),
  /** Movie id / series id / artist id for detail navigation. */
  externalId: z.number().int(),
  episodeId: z.number().int().optional(),
  albumId: z.number().int().optional(),
  title: z.string(),
  /** Episode title, album title, etc. */
  secondaryTitle: z.string().optional(),
  genres: z.array(z.string()).default([]),
  certification: z.string().optional(),
  network: z.string().optional(),
  releaseType: CalendarMovieReleaseTypeSchema.optional(),
  seasonNumber: z.number().int().optional(),
  episodeNumber: z.number().int().optional(),
  albumType: z.string().optional(),
  start: z.string(),
  end: z.string().optional(),
  allDay: z.boolean(),
  monitored: z.boolean(),
  hasFile: z.boolean(),
  status: AvailabilitySchema,
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const CalendarQuerySchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  unmonitored: z.coerce.boolean().default(true),
});
export type CalendarQuery = z.infer<typeof CalendarQuerySchema>;

export const CalendarResponseSchema = z.object({
  events: z.array(CalendarEventSchema),
  errors: z.array(
    z.object({
      instanceId: z.string(),
      instanceName: z.string(),
      message: z.string(),
    }),
  ),
});
export type CalendarResponse = z.infer<typeof CalendarResponseSchema>;

export const CalendarFeedSettingsSchema = z.object({
  /** Present when a token has been generated. Never returned on the public ICS route. */
  hasToken: z.boolean(),
  /** Full token — only on authenticated settings responses. */
  feedToken: z.string().optional(),
  /** Path+query relative to origin, e.g. /api/calendar.ics?token=… */
  feedPath: z.string().optional(),
});
export type CalendarFeedSettings = z.infer<typeof CalendarFeedSettingsSchema>;
