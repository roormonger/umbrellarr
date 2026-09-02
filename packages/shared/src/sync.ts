import { z } from "zod";

export const SyncRevisionSchema = z.object({
  library: z.number().int().nonnegative(),
  queue: z.number().int().nonnegative(),
  history: z.number().int().nonnegative(),
  requests: z.number().int().nonnegative(),
  issues: z.number().int().nonnegative(),
});
export type SyncRevision = z.infer<typeof SyncRevisionSchema>;
