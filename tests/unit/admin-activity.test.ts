// tests/unit/admin-activity.test.ts
// The activity log in plain sentences (D-057): every table the database audits
// (an "<Table>_audit" trigger in the migrations) has a sentence and a kind, so
// a change is never shown to the owner as a bare key.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { describeActivity, describeActor } from "@/lib/admin/activity";

const MIGRATIONS = path.resolve(__dirname, "../../prisma/migrations");

function auditedTables(): string[] {
  const tables = new Set<string>();
  for (const dir of readdirSync(MIGRATIONS)) {
    const file = path.join(MIGRATIONS, dir, "migration.sql");
    let sql = "";
    try {
      sql = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const m of sql.matchAll(/CREATE TRIGGER "([A-Za-z]+)_audit"/g)) tables.add(m[1]!);
  }
  return [...tables];
}

describe("describeActivity", () => {
  it("has a sentence for every audited table and every operation", () => {
    const tables = auditedTables();
    expect(tables.length).toBeGreaterThan(20);
    for (const t of tables) {
      for (const op of ["create", "update", "delete"]) {
        const { sentence, kind } = describeActivity(`${t.toLowerCase()}.${op}`);
        expect(sentence, `${t}.${op}`).not.toContain(".");
        expect(kind, `${t}.${op}`).not.toBe("other");
      }
    }
  });

  it("reads the sign-in events and keeps an unknown key as it is", () => {
    expect(describeActivity("auth.login")).toEqual({ sentence: "Signed in", kind: "signins" });
    expect(describeActivity("system.update").sentence).toBe("Changed a system");
    expect(describeActivity("something.new")).toEqual({ sentence: "something.new", kind: "other" });
  });

  it("names who did it", () => {
    expect(describeActor("SYSTEM", null)).toBe("The platform");
    expect(describeActor("ANONYMOUS", null)).toBe("Not signed in");
    expect(describeActor("ADMIN", "owner@example.com")).toBe("owner@example.com");
  });
});
