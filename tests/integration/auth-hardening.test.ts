// tests/integration/auth-hardening.test.ts
// #91 (F3.2) — admin security re-verified end to end: the proxy gate (BR-3.1),
// escalating lockouts (BR-3.2), no account enumeration, single-use challenges
// (BR-3.5), a fresh session per login (BR-3.8), cross-site refusal (BR-3.9),
// recovery codes: ten, hashed, regenerated on demand, low-count notice
// (BR-3.11, BR-3.12).

import { beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { Secret, TOTP } from "otpauth";
import { NextRequest } from "next/server";
import { POST as login } from "@/app/api/v1/admin/auth/login/route";
import { POST as verify2fa } from "@/app/api/v1/admin/auth/verify-2fa/route";
import { GET as codeStatus, POST as regenerateCodes } from "@/app/api/v1/admin/auth/recovery-codes/route";
import { GET as overview } from "@/app/api/v1/admin/overview/route";
import { PATCH as patchCvOptions } from "@/app/api/v1/admin/cv/options/route";
import { proxy } from "@/proxy";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/auth/crypto";
import { createSessionCookieValue } from "@/lib/auth/session";
import { generateRecoveryCodes, RECOVERY_CODE_COUNT } from "@/lib/auth/recovery-codes";

const RUN = `ah${Date.now().toString(36)}`;
const PASSWORD = "CorrectHorseBatteryStaple123!";
const MINUTE = 60 * 1000;

interface Fixture { id: string; email: string; secret: Secret; cookie: string }

async function createAdmin(name: string, recoveryCodes: string[] = []): Promise<Fixture> {
  const secret = new Secret({ size: 20 });
  const email = `${RUN}-${name}@example.com`;
  const admin = await db.adminUser.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      twoFactorSecret: encryptSecret(secret.base32),
      twoFactorEnabled: true,
      recoveryCodes: await Promise.all(recoveryCodes.map((c) => bcrypt.hash(c, 10))),
    },
  });
  return { id: admin.id, email, secret, cookie: createSessionCookieValue(admin.id, 1) };
}

const totp = (f: Fixture) => new TOTP({ secret: f.secret, digits: 6, period: 30 }).generate();
const freshStep = (f: Fixture) => db.adminUser.update({ where: { id: f.id }, data: { lastTotpStep: null } });

function post(url: string, body: object, headers: Record<string, string> = {}) {
  return new NextRequest(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
}
const tryLogin = (email: string, password: string, headers?: Record<string, string>) =>
  login(post("http://localhost/api/v1/admin/auth/login", { email, password }, headers));

async function signIn(f: Fixture) {
  await freshStep(f);
  const { challengeToken } = await (await tryLogin(f.email, PASSWORD)).json();
  return { challengeToken, res: await verify2fa(post("http://localhost/api/v1/admin/auth/verify-2fa", { challengeToken, code: totp(f) })) };
}

let main: Fixture;
beforeAll(async () => {
  main = await createAdmin("main");
});

describe("BR-3.1 — the proxy gate", () => {
  it("refuses an admin API call without a session (JSON 401) and sends a page to sign-in", async () => {
    const api = await proxy(new NextRequest("http://localhost/api/v1/admin/overview"));
    expect(api.status).toBe(401);
    const page = await proxy(new NextRequest("http://localhost/admin"));
    expect(page.status).toBe(307);
    expect(page.headers.get("location")).toContain("/admin/login");
  });

  it("lets a current session through, and refuses one from before a password change", async () => {
    const ok = await proxy(new NextRequest("http://localhost/admin", { headers: { cookie: `admin_session=${main.cookie}` } }));
    expect(ok.status).toBe(200);
    const stale = await createAdmin("stale");
    await db.adminUser.update({ where: { id: stale.id }, data: { sessionVersion: 2 } });
    const refused = await proxy(new NextRequest("http://localhost/api/v1/admin/overview", { headers: { cookie: `admin_session=${stale.cookie}` } }));
    expect(refused.status).toBe(401);
  });
});

describe("BR-3.2 — lockouts escalate; nothing reveals the admin's email", () => {
  it("a wrong password and an unknown email get byte-identical answers", async () => {
    const f = await createAdmin("enum");
    const wrong = await tryLogin(f.email, "wrong-password");
    const unknown = await tryLogin(`${RUN}-nobody@example.com`, "wrong-password");
    expect(wrong.status).toBe(unknown.status);
    expect(await wrong.text()).toBe(await unknown.text());
  });

  it("each consecutive lockout doubles the next; a successful login resets it", async () => {
    const f = await createAdmin("lock");
    const lockFor = async () => {
      for (let i = 0; i < 4; i++) await tryLogin(f.email, "wrong-password");
      const res = await tryLogin(f.email, "wrong-password");
      const { error } = await res.json();
      expect(error.code).toBe("ACCOUNT_LOCKED");
      return new Date(error.details.lockedUntil).getTime() - Date.now();
    };
    const expire = () => db.adminUser.update({ where: { id: f.id }, data: { lockedUntil: new Date(Date.now() - 1000) } });

    const first = await lockFor();
    await expire();
    const second = await lockFor();
    expect(first).toBeGreaterThan(13 * MINUTE);
    expect(first).toBeLessThan(15 * MINUTE);
    expect(second).toBeGreaterThan(27 * MINUTE);
    expect(second).toBeLessThan(29 * MINUTE);

    await expire();
    expect((await tryLogin(f.email, PASSWORD)).status).toBe(200);
    expect((await db.adminUser.findUniqueOrThrow({ where: { id: f.id } })).lockoutCount).toBe(0);
  });
});

describe("BR-3.5 / BR-3.8 — single-use challenges, a new session every time", () => {
  it("a challenge that already signed in can't be used again", async () => {
    const f = await createAdmin("once");
    const { challengeToken, res } = await signIn(f);
    expect(res.status).toBe(200);
    await freshStep(f);
    const again = await verify2fa(post("http://localhost/api/v1/admin/auth/verify-2fa", { challengeToken, code: totp(f) }));
    expect(again.status).toBe(401);
  });

  it("every login mints a different session, never derived from the challenge", async () => {
    const f = await createAdmin("fresh");
    const cookieOf = (r: Response) => /admin_session=([^;]+)/.exec(r.headers.get("set-cookie") ?? "")?.[1];
    const one = await signIn(f);
    const two = await signIn(f);
    const [a, b] = [cookieOf(one.res), cookieOf(two.res)];
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
    expect(a).not.toContain(one.challengeToken);
  });
});

describe("BR-3.9 — cross-site requests can't change anything", () => {
  const url = "http://localhost/api/v1/admin/cv/options";
  const patch = (headers: Record<string, string>) =>
    patchCvOptions(
      new NextRequest(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie: `admin_session=${main.cookie}`, ...headers },
        body: JSON.stringify({ generatedNote: "Built from this site's live data at the moment you download it." }),
      }),
    );

  it("refuses another site's Origin or a cross-site fetch, even with a valid session", async () => {
    expect((await patch({ origin: "https://evil.example" })).status).toBe(403);
    expect((await patch({ "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await patch({ origin: "null" })).status).toBe(403);
  });

  it("accepts the site's own origin, and a non-browser client (it has no victim's cookies to ride)", async () => {
    expect((await patch({ origin: "http://localhost", "sec-fetch-site": "same-origin" })).status).toBe(200);
    expect((await patch({})).status).toBe(200);
  });

  it("guards the login steps too", async () => {
    const res = await tryLogin(main.email, PASSWORD, { origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("CSRF_REJECTED");
  });
});

describe("BR-3.11 / BR-3.12 — recovery codes", () => {
  it("are generated ten at a time, unique, and stored only as hashes", { timeout: 30_000 }, async () => {
    const { plain, hashed } = await generateRecoveryCodes();
    expect(plain).toHaveLength(RECOVERY_CODE_COUNT);
    expect(new Set(plain).size).toBe(RECOVERY_CODE_COUNT);
    expect(hashed.some((h) => plain.includes(h))).toBe(false);
    expect(await bcrypt.compare(plain[0]!, hashed[0]!)).toBe(true);
  });

  it("the dashboard flags fewer than three unused codes", async () => {
    const f = await createAdmin("low", ["code-a", "code-b"]);
    const get = (u: string) => new NextRequest(u, { headers: { cookie: `admin_session=${f.cookie}` } });
    const body = await (await overview(get("http://localhost/api/v1/admin/overview"))).json();
    expect(body.attention.recoveryCodesLow).toBe(true);
    expect(body.security.recoveryCodesRemaining).toBe(2);
    expect(await (await codeStatus(get("http://localhost/api/v1/admin/auth/recovery-codes"))).json()).toEqual({ remaining: 2, low: true });
  });

  it("regenerating needs password + TOTP, returns ten new codes once, and ends every old one", { timeout: 30_000 }, async () => {
    const f = await createAdmin("regen", ["old-code-1", "old-code-2"]);
    const regen = (body: object) =>
      regenerateCodes(post("http://localhost/api/v1/admin/auth/recovery-codes", body, { cookie: `admin_session=${f.cookie}` }));

    await freshStep(f);
    expect((await regen({ currentPassword: "wrong-password", code: totp(f) })).status).toBe(401);

    await freshStep(f);
    const res = await regen({ currentPassword: PASSWORD, code: totp(f) });
    expect(res.status).toBe(200);
    const { codes, remaining, low } = await res.json();
    expect(codes).toHaveLength(10);
    expect({ remaining, low }).toEqual({ remaining: 10, low: false });

    const challenge = async () => (await (await tryLogin(f.email, PASSWORD)).json()).challengeToken;
    const useCode = async (code: string) => verify2fa(post("http://localhost/api/v1/admin/auth/verify-2fa", { challengeToken: await challenge(), code }));
    expect((await useCode("old-code-1")).status).toBe(401);
    expect((await useCode(codes[0])).status).toBe(200);
  });
});
