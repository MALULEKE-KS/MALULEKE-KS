// lib/guide/model.ts
// Where the AI guide's model comes from: the AI Gateway, by the id in the
// concierge.model setting. Kept apart from the route so tests can put a mock
// model here and exercise everything else for real.

import type { LanguageModel } from "ai";

/** A JWT's expiry, or null when it can't be read. */
function jwtExpiresAt(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * The AI Gateway authenticates with an API key, or with Vercel OIDC. On Vercel
 * the OIDC token is fresh on every request; a copy pulled into a local env
 * file expires after hours — then the guide rests instead of failing.
 */
export function guideProviderConfigured(now = Date.now()): boolean {
  if (process.env.AI_GATEWAY_API_KEY) return true;
  const oidc = process.env.VERCEL_OIDC_TOKEN;
  if (!oidc) return false;
  const exp = jwtExpiresAt(oidc);
  return exp === null || exp > now;
}

/** The model for a gateway id ("provider/model"). */
export function guideModel(id: string): LanguageModel {
  return id;
}
