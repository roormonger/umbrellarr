import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  APP_PASSWORD: z.string().optional(),
  APP_SESSION_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof EnvSchema> & {
  authRequired: boolean;
  sessionSecret: string;
};

function nonempty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.parse({
    ...raw,
    APP_PASSWORD: nonempty(raw.APP_PASSWORD),
    APP_SESSION_SECRET: nonempty(raw.APP_SESSION_SECRET),
  });
  const authRequired = Boolean(parsed.APP_PASSWORD);
  const sessionSecret =
    parsed.APP_SESSION_SECRET ??
    (parsed.NODE_ENV === "development"
      ? "dev-only-session-secret-change-me"
      : "");

  if (authRequired && !parsed.APP_SESSION_SECRET && parsed.NODE_ENV === "production") {
    throw new Error("APP_SESSION_SECRET is required when APP_PASSWORD is set in production");
  }

  return {
    ...parsed,
    authRequired,
    sessionSecret,
  };
}
