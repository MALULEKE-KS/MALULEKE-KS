// lib/auth/rate-limit.ts
// Shared rate limiter (BR-2.4 inquiries; BR-3.2/3.6 auth reuse the same
// primitive), backed by the rate_limit_hit() database function (F1.5).
//
// Atomic: the database decides and records each hit in one call, serialising
// concurrent requests for the same key, so N simultaneous requests can never
// all pass a limit of N-1 (the old read-then-write race).
//
// Private: the key holds a keyed hash of the client IP (lib/security/
// keyed-hash.ts), never the raw address (BR-2.4 privacy, POPIA). The scope
// prefix stays readable so an operator can see *which* limit a row belongs to.

import { db } from "@/lib/db";
import { clientIp } from "@/lib/security/client-ip";
import { keyedHash } from "@/lib/security/keyed-hash";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

/** The stored bucket key for a scope + client — exported so tests can target it. */
export function rateLimitKey(scope: string, request: Request): string {
  return `${scope}:ip:${keyedHash("rate-limit", clientIp(request))}`;
}

export async function hitRateLimit(
  scope: string,
  request: Request,
  maxCount: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const key = rateLimitKey(scope, request);
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const [row] = await db.$queryRaw<{ allowed: boolean; retry_after_seconds: number }[]>`
    SELECT allowed, retry_after_seconds FROM rate_limit_hit(${key}, ${maxCount}::int, ${windowSeconds}::int)`;
  if (!row) throw new Error("rate_limit_hit returned no row");
  return row.allowed ? { allowed: true } : { allowed: false, retryAfterMs: row.retry_after_seconds * 1000 };
}
