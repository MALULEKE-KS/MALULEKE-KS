// lib/security/keyed-hash.ts
// Privacy by construction (BR-2.4, BR-5.x, POPIA): request context that must
// be *comparable* but never *readable* — visitor IPs, user agents, attempted
// login emails — is stored as a keyed hash (HMAC-SHA256), never raw.
//
// Why keyed, not a plain hash: an IPv4 address has only ~4 billion values, so
// a plain SHA-256 of one can be reversed by brute force in minutes. An HMAC
// under a server secret can't be, without the secret.
//
// No new secret to manage: each purpose gets its own subkey derived from
// NEXTAUTH_SECRET with HKDF (RFC 5869), using the purpose as the context
// label. Domain separation means the rate-limit key, the audit-log key and the
// session-signing key are cryptographically independent, even though one
// secret is stored.

import { createHmac, hkdfSync } from "node:crypto";

export type HashPurpose = "ip" | "user-agent" | "subject" | "rate-limit";

const SALT = "maluleke-ks/keyed-hash/v1";
const subkeys = new Map<HashPurpose, Buffer>();

function subkey(purpose: HashPurpose): Buffer {
  const cached = subkeys.get(purpose);
  if (cached) return cached;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set — required to derive keyed-hash subkeys");
  const key = Buffer.from(hkdfSync("sha256", secret, SALT, `purpose:${purpose}`, 32));
  subkeys.set(purpose, key);
  return key;
}

/** Deterministic, irreversible fingerprint of `value` for one purpose. */
export function keyedHash(purpose: HashPurpose, value: string): string {
  return createHmac("sha256", subkey(purpose)).update(value, "utf8").digest("base64url");
}
