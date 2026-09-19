// tests/unit/migration-guard.test.ts
// F1.9: the migration guard flags destructive statements in new migrations,
// ignores prose, and honours an explicit approval on the line above.

import { describe, expect, it } from "vitest";
// @ts-expect-error — plain ESM script, no type declarations
import { findDestructive } from "../../scripts/migration-guard.mjs";

type Hit = { line: number; kind: string };
const kinds = (sql: string) => (findDestructive(sql) as Hit[]).map((h) => h.kind);

describe("migration guard", () => {
  it("passes additive SQL", () => {
    expect(
      kinds(`
        CREATE TABLE "X" (id text PRIMARY KEY);
        ALTER TABLE "X" ADD COLUMN name text;
        CREATE INDEX "X_name_idx" ON "X"(name);
        CREATE OR REPLACE VIEW "V" AS SELECT 1;
        ALTER TABLE "X" ADD CONSTRAINT "X_name_present" CHECK (name <> '');
      `),
    ).toEqual([]);
  });

  it("flags every kind of destructive statement", () => {
    expect(
      kinds(`
        DROP TABLE "X";
        ALTER TABLE "Y" DROP COLUMN name;
        ALTER TABLE "Y" DROP CONSTRAINT "Y_rule";
        ALTER TABLE "Y" RENAME COLUMN a TO b;
        ALTER TABLE "Y" ALTER COLUMN a SET DATA TYPE integer;
        TRUNCATE "Y";
        DELETE FROM "Y";
        ALTER TABLE "Y" DISABLE TRIGGER ALL;
        DROP TRIGGER "t" ON "Y";
        DROP VIEW "V";
      `),
    ).toEqual([
      "DROP TABLE", "DROP COLUMN", "DROP CONSTRAINT", "RENAME", "COLUMN TYPE CHANGE",
      "TRUNCATE", "DELETE", "DISABLE TRIGGER", "DROP TRIGGER", "DROP VIEW",
    ]);
  });

  it("ignores comments and string literals", () => {
    expect(
      kinds(`
        -- the app can't ALTER or DROP TABLE anything, or DELETE FROM history
        /* DROP COLUMN in a block comment */
        INSERT INTO "Note" (text) VALUES ('please DROP TABLE nothing; it''s prose');
      `),
    ).toEqual([]);
  });

  it("accepts a destructive statement approved on the line above, with a reason", () => {
    expect(
      kinds(`
        -- migration-guard: allow dropping the unused legacy table (#99)
        DROP TABLE "Legacy";
        DROP TABLE "NotApproved";
      `),
    ).toEqual(["DROP TABLE"]);
    expect(kinds(`-- migration-guard: allow\nDROP TABLE "NoReason";`)).toEqual(["DROP TABLE"]);
  });

  it("reports the line of each finding", () => {
    const [hit] = findDestructive(`CREATE TABLE "A" (id int);\nDROP TABLE "B";`) as Hit[];
    expect(hit).toMatchObject({ line: 2, kind: "DROP TABLE" });
  });
});
