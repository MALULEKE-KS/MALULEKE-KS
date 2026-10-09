// lib/guide/model.ts
// Where the AI guide's model comes from: the AI Gateway, by the id in the
// concierge.model setting. Kept apart from the route so tests can put a mock
// model here and exercise everything else for real.

import { gateway, wrapLanguageModel, type LanguageModel } from "ai";
import { firstTokenDeadline } from "@/lib/guide/first-token";

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
 * The AI Gateway authenticates with an API key, or with Vercel OIDC. On a
 * Vercel deployment the platform hands every request a fresh OIDC token (the
 * x-vercel-oidc-token header, which the gateway reads from the request
 * context) — it is never in process.env there, so VERCEL=1 is the signal.
 * Locally, a copy pulled into an env file expires after hours — then the
 * guide rests instead of failing.
 */
export function guideProviderConfigured(now = Date.now()): boolean {
  if (process.env.AI_GATEWAY_API_KEY) return true;
  if (process.env.VERCEL === "1") return true;
  const oidc = process.env.VERCEL_OIDC_TOKEN;
  if (!oidc) return false;
  const exp = jwtExpiresAt(oidc);
  return exp === null || exp > now;
}

export interface GuideModelOptions {
  /** Gateway ids to try, in order, when the model stays silent past the deadline. */
  fallbacks: string[];
  /** Milliseconds the model has to start answering; 0 = no deadline (lib/guide/first-token.ts). */
  firstTokenDeadlineMs: number;
}

/**
 * The model for a gateway id ("provider/model"). With a first-word deadline and
 * fallbacks, a model that stays silent is dropped for the next, one after another;
 * otherwise it is the plain id and the gateway alone handles failures.
 */
export function guideModel(id: string, options?: GuideModelOptions): LanguageModel {
  if (!options || options.firstTokenDeadlineMs <= 0 || options.fallbacks.length === 0) return id;
  return wrapLanguageModel({
    model: gateway.languageModel(id),
    middleware: firstTokenDeadline({ deadlineMs: options.firstTokenDeadlineMs, fallbacks: options.fallbacks.map((f) => gateway.languageModel(f)) }),
  });
}
