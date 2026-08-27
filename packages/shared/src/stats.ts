import { z } from "zod";

export const DashboardStatsSchema = z.object({
  queueCount: z.number().int().nonnegative(),
  missingCount: z.number().int().nonnegative(),
  instancesOnline: z.number().int().nonnegative(),
  instancesTotal: z.number().int().nonnegative(),
});
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
