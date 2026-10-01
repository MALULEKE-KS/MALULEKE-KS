// tests/unit/guide-model.test.ts
// When the AI guide counts as connected: a gateway key, or a Vercel OIDC token
// that hasn't expired (a stale one pulled into a local env file rests instead).

import { afterEach, describe, expect, it } from "vitest";
import { guideProviderConfigured } from "@/lib/guide/model";

const saved = { key: process.env.AI_GATEWAY_API_KEY, oidc: process.env.VERCEL_OIDC_TOKEN };
const jwt = (exp: number) => `h.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.s`;

afterEach(() => {
  process.env.AI_GATEWAY_API_KEY = saved.key ?? "";
  process.env.VERCEL_OIDC_TOKEN = saved.oidc ?? "";
});

describe("guideProviderConfigured", () => {
  const now = Date.UTC(2026, 8, 30);
  it("is off with no credentials", () => {
    process.env.AI_GATEWAY_API_KEY = "";
    process.env.VERCEL_OIDC_TOKEN = "";
    expect(guideProviderConfigured(now)).toBe(false);
  });
  it("is on with a gateway key", () => {
    process.env.AI_GATEWAY_API_KEY = "key";
    expect(guideProviderConfigured(now)).toBe(true);
  });
  it("is on with a fresh OIDC token, off with an expired one", () => {
    process.env.AI_GATEWAY_API_KEY = "";
    process.env.VERCEL_OIDC_TOKEN = jwt(now / 1000 + 3600);
    expect(guideProviderConfigured(now)).toBe(true);
    process.env.VERCEL_OIDC_TOKEN = jwt(now / 1000 - 3600);
    expect(guideProviderConfigured(now)).toBe(false);
  });
});
