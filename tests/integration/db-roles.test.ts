// tests/integration/db-roles.test.ts
// F1.8 (#76): least privilege, proven against the real database. Each check
// runs inside a transaction that assumes the role (SET LOCAL ROLE) and is
// rolled back, so nothing it tries can stick. Each refusal is paired with
// the allowed operation it must not block.
//
// DATABASE_URL_PUBLIC is required here (set in .env.test.local and in CI):
// the whole suite's public reads then run as the restricted role, and this
// file proves that client really is restricted.

import { describe, expect, it } from "vitest";
import { db, dbPublic } from "@/lib/db";

type Role = "platform_public" | "platform_runtime";

/** Runs `sql` as `role` and rolls back; returns "ok" or the database's refusal. */
async function asRole(role: Role, sql: string): Promise<string> {
  const ROLLBACK = "__rollback__";
  try {
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
      await tx.$queryRawUnsafe(sql);
      throw new Error(ROLLBACK);
    });
    return "ok";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return message.includes(ROLLBACK) ? "ok" : message;
  }
}

const DENIED = /permission denied|must be owner/;

describe("platform_public — public pages see the masked views and nothing else", () => {
  it("reads every public view, public lookups and search", async () => {
    for (const view of [
      "PublicSystem", "PublicImpact", "PublicTestimonial", "PublicTimeline", "PublicEducation",
      "PublicExperience", "PublicAchievement", "PublicOrganization", "PublicLedger", "PublicProfile",
      "PublicProfileLink", "PublicMetric", "SkillEvidence",
    ]) {
      expect(await asRole("platform_public", `SELECT * FROM "${view}" LIMIT 1`), view).toBe("ok");
    }
    for (const lookup of ["Status", "Domain", "MilestoneType", "SkillCategory", "RepoRelationship", "Skill"]) {
      expect(await asRole("platform_public", `SELECT * FROM "${lookup}" LIMIT 1`), lookup).toBe("ok");
    }
    expect(await asRole("platform_public", `SELECT * FROM search_public('systems')`)).toBe("ok");
  });

  it("can't read a raw table — not inquiries, admins, systems, the audit log or settings", async () => {
    for (const table of ["Inquiry", "AdminUser", "System", "ActivityLog", "PlatformSetting", "DocumentGen", "Profile", "SystemPace"]) {
      expect(await asRole("platform_public", `SELECT * FROM "${table}" LIMIT 1`), table).toMatch(DENIED);
    }
  });

  it("can't write anything, even to a view", async () => {
    expect(await asRole("platform_public", `UPDATE "PublicProfile" SET "displayName" = 'x'`)).toMatch(DENIED);
    expect(await asRole("platform_public", `DELETE FROM "Status"`)).toMatch(DENIED);
  });

  it("the app's public client connects as the restricted role", async () => {
    expect(process.env.DATABASE_URL_PUBLIC, "DATABASE_URL_PUBLIC must be set for tests").toBeTruthy();
    const [who] = await dbPublic.$queryRaw<{ member: boolean }[]>`
      SELECT pg_has_role(current_user, 'platform_public', 'MEMBER') AS member`;
    expect(who?.member).toBe(true);
    await expect(dbPublic.inquiry.count()).rejects.toThrow(/permission denied for table Inquiry/);
    expect(await dbPublic.publicSystem.count()).toBeGreaterThanOrEqual(0);
  });
});

describe("platform_runtime — the application changes rows, never structure", () => {
  it("reads and writes ordinary rows", async () => {
    expect(await asRole("platform_runtime", `SELECT count(*) FROM "Inquiry"`)).toBe("ok");
    expect(await asRole("platform_runtime", `UPDATE "Profile" SET location = location WHERE id = 1`)).toBe("ok");
    expect(await asRole("platform_runtime", `SELECT 1 FROM rate_limit_hit('roles-test', 5, 60)`)).toBe("ok");
  });

  it("can't change the schema or switch a rule off", async () => {
    expect(await asRole("platform_runtime", `ALTER TABLE "System" DISABLE TRIGGER ALL`)).toMatch(DENIED);
    expect(await asRole("platform_runtime", `DROP TRIGGER "System_br_1_9_no_delete" ON "System"`)).toMatch(DENIED);
    expect(await asRole("platform_runtime", `ALTER TABLE "System" DROP CONSTRAINT "System_br_1_1_publish_requires_approval"`)).toMatch(DENIED);
    expect(await asRole("platform_runtime", `DROP VIEW "PublicSystem"`)).toMatch(DENIED);
    expect(await asRole("platform_runtime", `TRUNCATE "Inquiry"`)).toMatch(DENIED);
    expect(await asRole("platform_runtime", `CREATE TABLE "Sneaky" (id int)`)).toMatch(DENIED);
  });

  it("isn't even granted what the triggers already refuse — two independent locks", async () => {
    expect(await asRole("platform_runtime", `UPDATE "ActivityLog" SET action = action`)).toMatch(DENIED);
    expect(await asRole("platform_runtime", `DELETE FROM "ActivityLog"`)).toMatch(DENIED);
    expect(await asRole("platform_runtime", `DELETE FROM "SystemStatusChange"`)).toMatch(DENIED);
    expect(await asRole("platform_runtime", `DELETE FROM "System" WHERE false`)).toMatch(DENIED);
    expect(await asRole("platform_runtime", `DELETE FROM "DocumentGen" WHERE false`)).toMatch(DENIED);
    expect(await asRole("platform_runtime", `DELETE FROM "MetricSnapshot" WHERE false`)).toMatch(DENIED);
    expect(await asRole("platform_runtime", `SELECT * FROM "_prisma_migrations"`)).toMatch(DENIED);
  });

  it("still fires the database's own rules — status history, auto-drafts and metrics work as the runtime", async () => {
    // Triggers run with the privileges of whoever fired them: the runtime must
    // be able to do everything they do on its behalf.
    // A real move into a SHIPPED status: writes status history and the
    // auto-drafted journey entry (rolled back afterwards).
    const sql = `
      UPDATE "System"
         SET "statusId" = (SELECT id FROM "Status" WHERE stage = 'SHIPPED' ORDER BY key LIMIT 1)
       WHERE id = (SELECT s.id FROM "System" s JOIN "Status" st ON st.id = s."statusId"
                    WHERE st.stage <> 'SHIPPED' ORDER BY s."createdAt" LIMIT 1)`;
    expect(await asRole("platform_runtime", sql)).toBe("ok");
    expect(await asRole("platform_runtime", `SELECT propose_metric_snapshot('systems.published', 1, 'COMPUTED')`)).toBe("ok");
  });
});
