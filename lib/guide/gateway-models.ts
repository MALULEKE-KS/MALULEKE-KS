// lib/guide/gateway-models.ts
// The guide never asks the AI Gateway for a model it has retired. Free tiers
// end without notice — on 2026-10-08 a fallback's free tier ended and every
// answer that reached it failed ("model not found"). Before each answer the
// route checks the gateway's public model list (read at most once an hour per
// server instance) and keeps only the configured models that still exist.
// When the list can't be read, the settings are used as they are.

const MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";
const MAX_AGE_MS = 60 * 60 * 1000;

let cached: { at: number; ids: Set<string> } | null = null;

/** The gateway's live language models, or null when its list can't be read. */
export async function liveGatewayModels(now = Date.now()): Promise<Set<string> | null> {
  if (cached && now - cached.at < MAX_AGE_MS) return cached.ids;
  try {
    const res = await fetch(MODELS_URL, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return cached?.ids ?? null;
    const body = (await res.json()) as { data?: { id?: string; type?: string }[] };
    const ids = new Set((body.data ?? []).flatMap((m) => (m.id && (!m.type || m.type === "language") ? [m.id] : [])));
    if (ids.size === 0) return cached?.ids ?? null;
    cached = { at: now, ids };
    return ids;
  } catch {
    return cached?.ids ?? null;
  }
}

/**
 * The model to ask and its fallbacks, without any the gateway no longer has.
 * If the configured model itself is gone, the first live fallback takes its
 * place; if none of them exist, the configuration is used unchanged (the
 * answer then fails honestly rather than silently picking an unvetted model).
 */
export function pickModels(primary: string, fallbacks: string[], live: Set<string> | null): { model: string; fallbacks: string[] } {
  if (!live) return { model: primary, fallbacks };
  const available = [primary, ...fallbacks].filter((id, i, all) => live.has(id) && all.indexOf(id) === i);
  if (available.length === 0) return { model: primary, fallbacks };
  return { model: available[0]!, fallbacks: available.slice(1) };
}
