// lib/auth/totp.ts
// TOTP verification for every step that asks for an authenticator code
// (login step 2, password change). A code is single-use (BR-3.14): the
// accepted 30-second step is recorded on the admin in the same statement that
// checks it, so a code seen over a shoulder or in a log can't be replayed
// within its validity window, and two simultaneous requests can't both use it.

import { Secret, TOTP } from "otpauth";
import type { Tx } from "@/lib/audit";
import { decryptSecret } from "@/lib/auth/crypto";

const PERIOD_SECONDS = 30; // RFC 6238 default — what authenticator apps use
const DRIFT_STEPS = 1; // tolerate one step of clock drift either side

export async function verifyTotpOnce(client: Tx, adminUserId: string, encryptedSecret: string, code: string): Promise<boolean> {
  const totp = new TOTP({ secret: Secret.fromBase32(decryptSecret(encryptedSecret)), digits: 6, period: PERIOD_SECONDS });
  const now = Date.now();
  const delta = totp.validate({ token: code, window: DRIFT_STEPS, timestamp: now });
  if (delta === null) return false;

  const step = Math.floor(now / 1000 / PERIOD_SECONDS) + delta;
  const { count } = await client.adminUser.updateMany({
    where: { id: adminUserId, OR: [{ lastTotpStep: null }, { lastTotpStep: { lt: step } }] },
    data: { lastTotpStep: step },
  });
  return count === 1;
}
