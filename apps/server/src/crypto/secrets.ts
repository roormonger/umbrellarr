import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

const ALGO = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;

export type SealedSecret = {
  ciphertext: string;
  iv: string;
  tag: string;
};

/** Accept 32-byte key as base64 or hex. */
export function parseSecretsKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("INSTANCE_SECRETS_KEY is empty");
  }

  let key: Buffer | null = null;
  try {
    const asB64 = Buffer.from(trimmed, "base64");
    if (asB64.length === KEY_BYTES) key = asB64;
  } catch {
    /* try hex */
  }
  if (!key) {
    try {
      const asHex = Buffer.from(trimmed, "hex");
      if (asHex.length === KEY_BYTES) key = asHex;
    } catch {
      /* fall through */
    }
  }
  if (!key) {
    throw new Error(
      "INSTANCE_SECRETS_KEY must be 32 bytes encoded as base64 or hex (e.g. openssl rand -base64 32)",
    );
  }
  return key;
}

export function encryptSecret(key: Buffer, plaintext: string): SealedSecret {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptSecret(key: Buffer, sealed: SealedSecret): string {
  const decipher = createDecipheriv(ALGO, key, Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Constant-time compare for optional future use. */
export function secretsEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
