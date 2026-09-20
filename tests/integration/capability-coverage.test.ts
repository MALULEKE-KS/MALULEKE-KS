// Structural API-surface guard (#82). The contract, implementation and the
// generated guides must move together — a route is not "done" if a client
// cannot discover it, and a documented endpoint must not be imaginary.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "@/lib/capabilities/map";
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

  it("keeps both generated capability guides current", async () => {
    const docs = path.join(process.cwd(), "docs");
    await expect(readFile(path.join(docs, "BACKEND-API-GUIDE.md"), "utf8")).resolves.toBe(renderBackendGuide());
    await expect(readFile(path.join(docs, "FRONTEND-DATA-GUIDE.md"), "utf8")).resolves.toBe(renderFrontendGuide());
  });
});
