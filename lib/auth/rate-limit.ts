// lib/auth/rate-limit.ts
// Shared rate limiter, backed by RateLimitEntry (prisma/schema.prisma) — not
// duplicated per route. Covers: BR-2.4 (5 inquiries/IP/24h). BR-3.2/BR-3.6
// (login/2FA attempt limiting) will reuse this same primitive once admin
// auth is built.
//
// Fixed-window counting: the first request in a window creates an entry
// with windowEnd = now + windowMs; subsequent requests within that window
// increment count. There's a narrow race under truly concurrent first
// requests for the same bucketKey (two requests could each see "no active
// window" and both create one) — an accepted tradeoff for a low-traffic
// contact form, not worth a heavier locking scheme for. RateLimitEntry rows
// are deliberately cheap to over-produce; pruning expired rows is a
// separate scheduled job (not yet built — see lib/adapters/scheduler/).

import { db } from "@/lib/db";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export async function checkAndIncrementRateLimit(
  bucketKey: string,
  maxCount: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date();

  const active = await db.rateLimitEntry.findFirst({
    where: { bucketKey, windowEnd: { gt: now } },
    orderBy: { windowEnd: "desc" },
  });

  if (!active) {
    await db.rateLimitEntry.create({
      data: { bucketKey, windowEnd: new Date(now.getTime() + windowMs), count: 1 },
    });
    return { allowed: true };
  }

  if (active.count >= maxCount) {
    return { allowed: false, retryAfterMs: active.windowEnd.getTime() - now.getTime() };
  }

  await db.rateLimitEntry.update({
    where: { id: active.id },
    data: { count: { increment: 1 } },
  });
  return { allowed: true };
}

// Standard Vercel/proxy header — the first entry in x-forwarded-for is the
// original client IP. Falls back to a constant bucket if genuinely absent
// (local dev without a proxy) rather than throwing.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return "unknown";
}
