// scripts/backup-drill.ts — verify a restored database against its source
// (#97, Constitution §11 "backup drill"). Read-only on both sides.
//
// A drill: restore production to a point in time into a separate Neon branch
// (docs/DEPLOYMENT.md, "Backup & restore"), then run
//
//   DRILL_SOURCE_URL=<primary branch URL> DRILL_RESTORED_URL=<restored branch URL> \
//     npx tsx scripts/backup-drill.ts
//
// It passes when the restored database has the same migrations and the same
// tables and views, every one of them readable, and prints each table's row
// count on both sides (a restore to an earlier time may hold fewer rows — the
// counts are shown for the operator to judge, not failed on).

import { PrismaClient } from "@prisma/client";

const sourceUrl = process.env.DRILL_SOURCE_URL;
const restoredUrl = process.env.DRILL_RESTORED_URL;
if (!sourceUrl || !restoredUrl) {
  console.error("Set DRILL_SOURCE_URL and DRILL_RESTORED_URL (see docs/DEPLOYMENT.md, Backup & restore).");
  process.exit(2);
}
if (sourceUrl === restoredUrl) {
  console.error("DRILL_SOURCE_URL and DRILL_RESTORED_URL are the same database — a drill needs a separate restore.");
  process.exit(2);
}

interface Snapshot {
  migrations: string[];
  relations: Map<string, "table" | "view">;
  counts: Map<string, number | string>;
}

async function snapshot(url: string): Promise<Snapshot> {
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const migrations = (
      await db.$queryRaw<{ migration_name: string }[]>`
        SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`
    ).map((m) => m.migration_name);
    const rels = await db.$queryRaw<{ name: string; kind: string }[]>`
      SELECT c.relname AS name, CASE c.relkind WHEN 'v' THEN 'view' ELSE 'table' END AS kind
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v') AND c.relname <> '_prisma_migrations'
       ORDER BY 1`;
    const relations = new Map(rels.map((r) => [r.name, r.kind as "table" | "view"]));
    const counts = new Map<string, number | string>();
    for (const name of relations.keys()) {
      try {
        const [row] = await db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM "${name.replace(/"/g, '""')}"`);
        counts.set(name, Number(row!.n));
      } catch (err) {
        counts.set(name, `unreadable: ${err instanceof Error ? err.message.split("\n").pop() : err}`);
      }
    }
    return { migrations, relations, counts };
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  // Both were checked at the top (the script exits without them).
  const [source, restored] = await Promise.all([snapshot(sourceUrl!), snapshot(restoredUrl!)]);
  const problems: string[] = [];

  const missingMigrations = source.migrations.filter((m) => !restored.migrations.includes(m));
  if (missingMigrations.length) problems.push(`restored database lacks migrations: ${missingMigrations.join(", ")}`);
  for (const name of source.relations.keys()) if (!restored.relations.has(name)) problems.push(`missing ${source.relations.get(name)}: ${name}`);

  console.log(`${"relation".padEnd(28)} ${"source".padStart(10)} ${"restored".padStart(10)}`);
  for (const [name, kind] of source.relations) {
    const a = source.counts.get(name);
    const b = restored.counts.get(name);
    if (typeof b === "string") problems.push(`${kind} ${name} is ${b}`);
    console.log(`${`${name}${kind === "view" ? " (view)" : ""}`.padEnd(28)} ${String(a).padStart(10)} ${String(b ?? "—").padStart(10)}`);
  }

  if (problems.length) {
    console.error(`\nDRILL FAILED:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`\nDRILL PASSED: ${restored.migrations.length} migrations, ${restored.relations.size} tables and views, all readable.`);
}

main().catch((err) => {
  console.error("Drill could not run:", err instanceof Error ? err.message : err);
  process.exit(1);
});
