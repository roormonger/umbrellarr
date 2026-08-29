import { z } from "zod";

/** In-memory BFF library snapshot status (STALE kept for older clients). */
export const CacheStatusSchema = z.enum(["HIT", "STALE", "MISS"]);
export type CacheStatus = z.infer<typeof CacheStatusSchema>;
