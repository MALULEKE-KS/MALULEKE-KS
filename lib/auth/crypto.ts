// lib/auth/crypto.ts
// AES-256-GCM encryption for AdminUser.twoFactorSecret at rest
// (TWO_FACTOR_ENCRYPTION_KEY, .env.example) — the TOTP secret is the one
// thing in this schema that, if leaked via a DB dump, would let an
// attacker generate valid 2FA codes indefinitely, so it's never stored
// plaintext (schema.prisma's own comment on the field says this).

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

function getKey(): Buffer {
  const raw = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (!raw) throw new Error("TWO_FACTOR_ENCRYPTION_KEY is not set");
  // Accepts any-length passphrase, derives a real 32-byte key — simpler
  // operationally than requiring the env var to be exactly 32 raw bytes.
  return scryptSync(raw, "malulekeks-2fa-secret", 32);
}

const IV_LENGTH = 12; // GCM standard

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(ciphertext: string): string {
  const [ivB64, authTagB64, dataB64] = ciphertext.split(".");
  if (!ivB64 || !authTagB64 || !dataB64) throw new Error("Malformed encrypted secret");

  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
