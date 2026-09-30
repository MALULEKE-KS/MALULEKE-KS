// lib/auth/recovery-codes.ts
// Recovery codes (BR-3.11, BR-3.12): exactly ten, random, shown once and
// stored only as bcrypt hashes; each works once. The one source for the setup
// script and the in-app regeneration, so both follow the same rule.

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

export const RECOVERY_CODE_COUNT = 10; // BR-3.11
export const RECOVERY_CODES_LOW_BELOW = 3; // BR-3.12 — "fewer than 3 unused remain"
const BCRYPT_COST = 12;

/** Ten new codes: the plaintext to show once, and the hashes to store. */
export async function generateRecoveryCodes(): Promise<{ plain: string[]; hashed: string[] }> {
  const plain = Array.from({ length: RECOVERY_CODE_COUNT }, () => randomBytes(6).toString("hex"));
  const hashed = await Promise.all(plain.map((code) => bcrypt.hash(code, BCRYPT_COST)));
  return { plain, hashed };
}

export function recoveryCodeStatus(hashedCodes: string[]) {
  return { remaining: hashedCodes.length, low: hashedCodes.length < RECOVERY_CODES_LOW_BELOW };
}
