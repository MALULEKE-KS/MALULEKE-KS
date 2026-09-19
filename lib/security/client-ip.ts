// lib/security/client-ip.ts
// The client's IP, as reported by the platform. On Vercel, `x-real-ip` and
// `x-forwarded-for` are both set by Vercel's edge and overwritten on every
// request, so a client can't spoof them (Vercel docs, "Request headers").
// ipAddress() reads x-real-ip; the forwarded-for fallback covers local runs
// and tests, which simulate distinct clients through that header.
//
// Callers should never store this raw value — hash it (lib/security/keyed-hash).

import { ipAddress } from "@vercel/functions";

export function clientIp(request: Request): string {
  const fromPlatform = ipAddress(request);
  if (fromPlatform) return fromPlatform;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "unknown";
}
