// scripts/migration-guard.mjs — F1.9: migrations stay additive (EXT-1).
//
// Run by CI on every pull request against the migrations it adds:
//
//   node scripts/migration-guard.mjs <base-ref>        e.g. origin/main
//
// 1. An already-applied migration is history: editing, renaming or deleting
//    one fails, always (production has run the old text; changing it would
//    make environments disagree about what the schema is).
// 2. A new migration may not destroy data or remove a rule — dropping or
//    renaming a table, column, view, type, function or trigger; dropping a
//    constraint; changing a column's type; truncating or deleting rows;
//    disabling a trigger. Each such statement needs an explicit, reviewed
//    approval on the line directly above it:
//
//      -- migration-guard: allow <reason, with the issue number>
//
// Comments and string literals are ignored, so prose mentioning DROP is fine.
// Exit 0 = pass, 1 = violations (listed), 2 = usage error.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Destructive statement patterns, matched against SQL with comments and strings removed. */
export const DESTRUCTIVE = [
  { kind: "DROP TABLE", re: /\bDROP\s+TABLE\b/i },
  { kind: "DROP COLUMN", re: /\bDROP\s+COLUMN\b/i },
  { kind: "DROP CONSTRAINT", re: /\bDROP\s+CONSTRAINT\b/i },
  { kind: "DROP VIEW", re: /\bDROP\s+(MATERIALIZED\s+)?VIEW\b/i },
  { kind: "DROP TYPE", re: /\bDROP\s+TYPE\b/i },
  { kind: "DROP FUNCTION", re: /\bDROP\s+(FUNCTION|PROCEDURE)\b/i },
  { kind: "DROP TRIGGER", re: /\bDROP\s+TRIGGER\b/i },
  { kind: "DROP SCHEMA", re: /\bDROP\s+SCHEMA\b/i },
  { kind: "RENAME", re: /\bRENAME\b/i },
  { kind: "COLUMN TYPE CHANGE", re: /\bALTER\s+COLUMN\s+\S+\s+(SET\s+DATA\s+)?TYPE\b/i },
  { kind: "TRUNCATE", re: /\bTRUNCATE\b/i },
  { kind: "DELETE", re: /\bDELETE\s+FROM\b/i },
  { kind: "DISABLE TRIGGER", re: /\bDISABLE\s+TRIGGER\b/i },
];

const APPROVAL = /^\s*--\s*migration-guard:\s*allow\s+\S/i;

/**
 * Blank out comments and quoted literals, keeping line structure, so a match
 * can be reported by line and prose never trips the guard. Dollar-quoted
 * bodies (functions) are kept: a DELETE inside a function body is code.
 */
function stripCommentsAndStrings(sql) {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const two = sql.slice(i, i + 2);
    if (two === "--") {
      while (i < sql.length && sql[i] !== "\n") out += " ", i++;
    } else if (two === "/*") {
      while (i < sql.length && sql.slice(i, i + 2) !== "*/") out += sql[i] === "\n" ? "\n" : " ", i++;
      out += "  ", i += 2;
    } else if (sql[i] === "'") {
      out += " ", i++;
      while (i < sql.length && !(sql[i] === "'" && sql[i + 1] !== "'")) {
        if (sql[i] === "'" && sql[i + 1] === "'") out += "  ", i += 2;
        else out += sql[i] === "\n" ? "\n" : " ", i++;
      }
      out += " ", i++;
    } else {
      out += sql[i++];
    }
  }
  return out;
}

/** Destructive statements in `sql` that lack an approval comment on the line above. */
export function findDestructive(sql) {
  const raw = sql.replace(/\r\n/g, "\n").split("\n");
  const code = stripCommentsAndStrings(sql.replace(/\r\n/g, "\n")).split("\n");
  const found = [];
  code.forEach((line, index) => {
    for (const { kind, re } of DESTRUCTIVE) {
      if (!re.test(line)) continue;
      const approved = index > 0 && APPROVAL.test(raw[index - 1]);
      if (!approved) found.push({ line: index + 1, kind, text: raw[index].trim() });
    }
  });
  return found;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function main() {
  const base = process.argv[2];
  if (!base) {
    console.error("usage: node scripts/migration-guard.mjs <base-ref>");
    process.exit(2);
  }
  const mergeBase = git(["merge-base", base, "HEAD"]);
  const changes = git(["diff", "--name-status", "--no-renames", mergeBase, "HEAD", "--", "prisma/migrations"])
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"))
    .filter(([, file]) => file.endsWith("migration.sql"));

  const problems = [];
  for (const [status, file] of changes) {
    if (status !== "A") {
      problems.push(`${file}: an applied migration was ${status === "D" ? "deleted" : "modified"} — write a new migration instead`);
      continue;
    }
    for (const hit of findDestructive(readFileSync(file, "utf8"))) {
      problems.push(`${file}:${hit.line}: ${hit.kind} — "${hit.text}" (approve with "-- migration-guard: allow <reason>" above it)`);
    }
  }

  const added = changes.filter(([s]) => s === "A").length;
  if (problems.length) {
    console.error(`migration-guard: ${problems.length} problem(s) in ${changes.length} changed migration(s):`);
    for (const p of problems) console.error(`  ✖ ${p}`);
    process.exit(1);
  }
  console.log(`migration-guard: ${added} new migration(s), all additive.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
