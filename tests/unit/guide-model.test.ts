// tests/unit/guide-model.test.ts
// When the AI guide counts as connected: a gateway key; a Vercel deployment
// (the platform gives each request an OIDC token in a header, never in
// process.env); or a local OIDC token that hasn't expired (a stale one pulled
// into a local env file rests instead).

import { afterEach, describe, expect, it } from "vitest";
import { guideModel, guideProviderConfigured } from "@/lib/guide/model";

const saved = { key: process.env.AI_GATEWAY_API_KEY, oidc: process.env.VERCEL_OIDC_TOKEN, vercel: process.env.VERCEL };
const jwt = (exp: number) => `h.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.s`;

afterEach(() => {
  process.env.AI_GATEWAY_API_KEY = saved.key ?? "";
  process.env.VERCEL_OIDC_TOKEN = saved.oidc ?? "";
  process.env.VERCEL = saved.vercel ?? "";
});

describe("guideProviderConfigured", () => {
  const now = Date.UTC(2026, 8, 30);
  const none = () => {
    process.env.AI_GATEWAY_API_KEY = "";
    process.env.VERCEL_OIDC_TOKEN = "";
    process.env.VERCEL = "";
  };
  it("is off with no credentials", () => {
    none();
    expect(guideProviderConfigured(now)).toBe(false);
  });
  it("is on with a gateway key", () => {
    none();
    process.env.AI_GATEWAY_API_KEY = "key";
    expect(guideProviderConfigured(now)).toBe(true);
  });
  it("is on in a Vercel deployment, where the OIDC token arrives with each request", () => {
    none();
    process.env.VERCEL = "1";
    expect(guideProviderConfigured(now)).toBe(true);
  });
  it("is on with a fresh local OIDC token, off with an expired one", () => {
    none();
    process.env.VERCEL_OIDC_TOKEN = jwt(now / 1000 + 3600);
    expect(guideProviderConfigured(now)).toBe(true);
    process.env.VERCEL_OIDC_TOKEN = jwt(now / 1000 - 3600);
    expect(guideProviderConfigured(now)).toBe(false);
  });
});

describe("guideModel", () => {
  it("is the plain gateway id with no deadline or no fallback, so the gateway alone handles failures", () => {
    expect(guideModel("vendor/model-a")).toBe("vendor/model-a");
    expect(guideModel("vendor/model-a", { fallbacks: ["vendor/model-b"], firstTokenDeadlineMs: 0 })).toBe("vendor/model-a");
    expect(guideModel("vendor/model-a", { fallbacks: [], firstTokenDeadlineMs: 4000 })).toBe("vendor/model-a");
  });

  it("is a wrapped model once a deadline and a fallback are set — same model, now with a first-word deadline", () => {
    const wrapped = guideModel("vendor/model-a", { fallbacks: ["vendor/model-b"], firstTokenDeadlineMs: 4000 });
    expect(typeof wrapped).toBe("object");
    expect((wrapped as { modelId: string }).modelId).toBe("vendor/model-a");
  });
});
