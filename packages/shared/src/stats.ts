import { z } from "zod";

export const NavCountsSchema = z.object({
  movies: z.number().int().nonnegative().optional(),
  shows: z.number().int().nonnegative().optional(),
  music: z.number().int().nonnegative().optional(),
  requests: z.number().int().nonnegative().optional(),
  issues: z.number().int().nonnegative().optional(),
  queue: z.number().int().nonnegative().optional(),
  history: z.number().int().nonnegative().optional(),
  wanted: z.number().int().nonnegative().optional(),
  indexers: z.number().int().nonnegative().optional(),
});
export type NavCounts = z.infer<typeof NavCountsSchema>;

export const DashboardStatsSchema = z.object({
  queueCount: z.number().int().nonnegative(),
  missingCount: z.number().int().nonnegative(),
  instancesOnline: z.number().int().nonnegative(),
  instancesTotal: z.number().int().nonnegative(),
  nav: NavCountsSchema.optional(),
});
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
