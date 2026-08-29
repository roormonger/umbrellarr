import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  APP_PASSWORD: z.string().optional(),
  APP_SESSION_SECRET: z.string().optional(),
  INSTANCE_SECRETS_KEY: z.string().optional(),
  DATABASE_PATH: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof EnvSchema> & {
  authRequired: boolean;
  sessionSecret: string;
  /** Raw key material for Arr API key encryption (parsed later). */
  instanceSecretsKey: string;
};

function nonempty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Dev-only fallback: 32 zero bytes as base64 — never use in production. */
const DEV_SECRETS_KEY = Buffer.alloc(32, 0).toString("base64");

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.parse({
    ...raw,
    APP_PASSWORD: nonempty(raw.APP_PASSWORD),
    APP_SESSION_SECRET: nonempty(raw.APP_SESSION_SECRET),
    INSTANCE_SECRETS_KEY: nonempty(raw.INSTANCE_SECRETS_KEY),
    DATABASE_PATH: nonempty(raw.DATABASE_PATH),
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

  let instanceSecretsKey = parsed.INSTANCE_SECRETS_KEY ?? "";
  if (!instanceSecretsKey) {
    if (parsed.NODE_ENV === "production") {
      throw new Error(
        "INSTANCE_SECRETS_KEY is required in production (32 bytes base64/hex) to encrypt Arr API keys",
      );
    }
    console.warn(
      "[config] INSTANCE_SECRETS_KEY unset — using insecure development default. Set a real key before production.",
    );
    instanceSecretsKey = DEV_SECRETS_KEY;
  }

  return {
    ...parsed,
    authRequired,
    sessionSecret,
    instanceSecretsKey,
  };
}
