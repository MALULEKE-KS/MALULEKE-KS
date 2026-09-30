// Structural API-surface guard (#82). The contract, implementation and the
// generated guides must move together — a route is not "done" if a client
// cannot discover it, and a documented endpoint must not be imaginary.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CAPABILITIES, NOT_EXPOSED } from "@/lib/capabilities/map";
import { db } from "@/lib/db";
import { renderBackendGuide, renderFrontendGuide } from "@/lib/capabilities/render";

const METHODS = /export\s+(?:const|async\s+function)\s+(GET|POST|PUT|PATCH|DELETE)\b/g;

async function routeEndpoints(directory: string, segments: string[] = []): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const endpoints: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      endpoints.push(...(await routeEndpoints(entryPath, [...segments, entry.name])));
      continue;
    }
    if (entry.name !== "route.ts") continue;
    const source = await readFile(entryPath, "utf8");
    const route = `/${segments.join("/")}`.replace(/\[([^\]]+)\]/g, "{$1}");
    for (const match of source.matchAll(METHODS)) endpoints.push(`${match[1]} ${route}`);
  }
  return endpoints;
}

async function contractEndpoints() {
  const source = await readFile(path.join(process.cwd(), "openapi-contract.yaml"), "utf8");
  const endpoints: string[] = [];
  let route: string | undefined;
  for (const line of source.split(/\r?\n/)) {
    const pathMatch = /^  (\/[^:]+):$/.exec(line);
    if (pathMatch) {
      route = pathMatch[1];
      continue;
    }
    const methodMatch = route && /^    (get|post|put|patch|delete):/.exec(line);
    if (methodMatch) endpoints.push(`${methodMatch[1]!.toUpperCase()} ${route}`);
  }
  return endpoints;
}

const sorted = (endpoints: string[]) => [...new Set(endpoints)].sort();

describe("#82 capability coverage", () => {
  it("declares every implemented API method exactly once in the capability map", async () => {
    const implemented = await routeEndpoints(path.join(process.cwd(), "app", "api", "v1"));
    const documented = CAPABILITIES.flatMap((capability) => capability.endpoints);
    expect(sorted(documented)).toEqual(sorted(implemented));
  });

  it("declares every supported API method in the OpenAPI contract", async () => {
    const documented = CAPABILITIES.flatMap((capability) => capability.endpoints);
    expect(sorted(await contractEndpoints())).toEqual(sorted(documented));
  });

  it("maps every table, view and function in the database — or exempts it with a reason", async () => {
    // Ours only: extension functions (pg_trgm, pgcrypto, vector) and trigger
    // functions (internal machinery, never called directly) are excluded.
    const objects = await db.$queryRaw<{ name: string }[]>`
      SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm') AND c.relname <> '_prisma_migrations'
      UNION
      SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.prorettype <> 'trigger'::regtype
         AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')`;
    const inDatabase = sorted(objects.map((o) => o.name));
    const mapped = new Set([...CAPABILITIES.flatMap((c) => c.db), ...Object.keys(NOT_EXPOSED)]);

    expect(inDatabase.filter((name) => !mapped.has(name)), "database objects missing from the capability map").toEqual([]);
    expect(sorted([...mapped]).filter((name) => !inDatabase.includes(name)), "mapped names that don't exist in the database").toEqual([]);
  });

  it("keeps both generated capability guides current", async () => {
    const docs = path.join(process.cwd(), "docs");
    // Line endings follow the checkout (CRLF on Windows), not the content.
    const read = async (file: string) => (await readFile(path.join(docs, file), "utf8")).replace(/\r\n/g, "\n");
    expect(await read("BACKEND-API-GUIDE.md")).toBe(renderBackendGuide());
    expect(await read("FRONTEND-DATA-GUIDE.md")).toBe(renderFrontendGuide());
  });
});
