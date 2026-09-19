// tests/integration/audit-and-rate-limit.test.ts
// F1.3 (#62) and F1.5 (#64): proves the audit log is tamper-evident and
// complete, and that rate limiting is atomic and never stores a raw IP.

import { beforeAll, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/v1/admin/auth/login/route";
import { db } from "@/lib/db";
import { hitRateLimit, rateLimitKey } from "@/lib/auth/rate-limit";
import { keyedHash } from "@/lib/security/keyed-hash";

const RUN = `ar-${Date.now().toString(36)}`;

function requestFrom(ip: string, body?: object) {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip, "user-agent": `test-agent-${RUN}` },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("F1.3 — the audit log is append-only (enforced by the database)", () => {
  let entryId: string;

  beforeAll(async () => {
    const entry = await db.activityLog.create({
      data: { actorType: "SYSTEM", action: `test.append_only.${RUN}` },
    });
    entryId = entry.id;
  });

  it("refuses to edit an entry", async () => {
    await expect(
      db.activityLog.update({ where: { id: entryId }, data: { action: "tampered" } }),
    ).rejects.toThrow(/append-only/);
  });

  it("refuses to delete an entry", async () => {
    await expect(db.activityLog.delete({ where: { id: entryId } })).rejects.toThrow(/append-only/);
    await expect(db.activityLog.deleteMany({ where: { id: entryId } })).rejects.toThrow(/append-only/);
  });

  it("refuses to truncate the table", async () => {
    await expect(db.$executeRawUnsafe('TRUNCATE "ActivityLog"')).rejects.toThrow(/append-only/);
  });

  it("requires ADMIN entries to name their admin, and others not to", async () => {
    await expect(db.activityLog.create({ data: { actorType: "ADMIN", action: "test.no_admin" } })).rejects.toThrow(
      /ActivityLog_actor_consistent/,
    );
    const anyAdmin = await db.adminUser.create({ data: { email: `${RUN}-actor@example.com`, passwordHash: "x" } });
    await expect(
      db.activityLog.create({ data: { actorType: "ANONYMOUS", adminUserId: anyAdmin.id, action: "test.anon_with_admin" } }),
    ).rejects.toThrow(/ActivityLog_actor_consistent/);
  });
});

describe("F1.3 — every login attempt is logged (BR-3.4), privately", () => {
  it("records an unknown-email failure as ANONYMOUS, storing only keyed hashes", async () => {
    const email = `${RUN}-nobody@example.com`;
    const ip = "198.51.100.23";
    const started = Date.now();
    const res = await login(requestFrom(ip, { email, password: "definitely-not-it" }));
    const elapsed = Date.now() - started;

    expect(res.status).toBe(401);
    // Same bcrypt work as a real account (cost 12 is well over 50 ms), so
    // timing can't reveal whether the email exists.
    expect(elapsed).toBeGreaterThan(50);

    const entry = await db.activityLog.findFirstOrThrow({
      where: { action: "auth.login_failed", subjectHash: keyedHash("subject", email) },
      orderBy: { createdAt: "desc" },
    });
    expect(entry.actorType).toBe("ANONYMOUS");
    expect(entry.adminUserId).toBeNull();
    expect(entry.ipHash).toBe(keyedHash("ip", ip));
    expect(entry.userAgentHash).toBe(keyedHash("user-agent", `test-agent-${RUN}`));

    const stored = JSON.stringify(entry);
    expect(stored).not.toContain(email);
    expect(stored).not.toContain(ip);
  });
});

describe("F1.5 — rate limiting is atomic and private", () => {
  it("lets exactly the limit through when requests arrive simultaneously", async () => {
    const scope = `test-concurrency-${RUN}`;
    const req = () => requestFrom("203.0.113.77");
    const results = await Promise.all(Array.from({ length: 20 }, () => hitRateLimit(scope, req(), 5, 60_000)));

    expect(results.filter((r) => r.allowed)).toHaveLength(5);
    const blocked = results.filter((r) => !r.allowed);
    expect(blocked).toHaveLength(15);
    for (const r of blocked) expect(r.retryAfterMs).toBeGreaterThan(0);

    const rows = await db.rateLimitEntry.findMany({ where: { bucketKey: { startsWith: `${scope}:` } } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.count).toBe(5);
  });

  it("never stores the raw IP", async () => {
    const scope = `test-privacy-${RUN}`;
    const ip = "203.0.113.200";
    await hitRateLimit(scope, requestFrom(ip), 3, 60_000);

    const rows = await db.rateLimitEntry.findMany({ where: { bucketKey: { startsWith: `${scope}:` } } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.bucketKey).toBe(rateLimitKey(scope, requestFrom(ip)));
    expect(rows[0]!.bucketKey).not.toContain(ip);
  });

  it("keeps different clients in different buckets", async () => {
    const scope = `test-isolation-${RUN}`;
    await hitRateLimit(scope, requestFrom("203.0.113.1"), 1, 60_000);
    const other = await hitRateLimit(scope, requestFrom("203.0.113.2"), 1, 60_000);
    const same = await hitRateLimit(scope, requestFrom("203.0.113.1"), 1, 60_000);
    expect(other.allowed).toBe(true);
    expect(same.allowed).toBe(false);
  });
});
