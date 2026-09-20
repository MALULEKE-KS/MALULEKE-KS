// lib/capabilities/render.ts
// Renders the two guides from the capability map (#82). Pure and
// deterministic, so the coverage test can prove the committed guides are
// current. Regenerate with: npm run docs:capabilities

import { CAPABILITIES, NOT_EXPOSED, type Capability } from "@/lib/capabilities/map";

const GENERATED =
  "<!-- Generated from lib/capabilities/map.ts by `npm run docs:capabilities`. Don't edit by hand — edit the map. -->";

const list = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join("\n") : "- —");
const code = (items: string[]) => items.map((i) => `\`${i}\``);

function byAudience(audience: Capability["audience"]) {
  return CAPABILITIES.filter((c) => c.audience === audience);
}

export function renderBackendGuide(): string {
  const dbIndex = new Map<string, string[]>();
  for (const c of CAPABILITIES) for (const o of c.db) dbIndex.set(o, [...(dbIndex.get(o) ?? []), c.id]);

  const section = (c: Capability) =>
    [
      `### ${c.title}`,
      "",
      `\`${c.id}\` · ${c.audience}`,
      "",
      c.summary,
      "",
      "**Endpoints** (`/api/v1`, see `openapi-contract.yaml`)",
      "",
      list(code(c.endpoints)),
      "",
      "**Database**",
      "",
      list(code(c.db)),
      "",
      `**Rules:** ${c.rules.length ? c.rules.join(", ") : "—"}`,
      "",
      ...(c.notes.length ? ["**Notes**", "", list(c.notes), ""] : []),
    ].join("\n");

  return [
    GENERATED,
    "",
    "# Backend API guide",
    "",
    "Every capability the platform has: the database objects behind it, the endpoints that serve it, and the business rules it enforces. Nothing in the database is left without an endpoint unless it's listed under *Not exposed*, with the reason. The frontend view of the same map is `docs/FRONTEND-DATA-GUIDE.md`.",
    "",
    `**${CAPABILITIES.length} capabilities · ${CAPABILITIES.reduce((n, c) => n + c.endpoints.length, 0)} endpoints.**`,
    "",
    "## Public",
    "",
    ...byAudience("public").map(section),
    "## Admin",
    "",
    "Every admin endpoint runs through `withAdmin` (session, then an attributed transaction); the database audits every change (F2.1).",
    "",
    ...byAudience("admin").map(section),
    "## Database objects → capabilities",
    "",
    "| Object | Used by |",
    "|---|---|",
    ...[...dbIndex.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([o, ids]) => `| \`${o}\` | ${ids.join(", ")} |`),
    "",
    "## Not exposed",
    "",
    "| Object | Why |",
    "|---|---|",
    ...Object.entries(NOT_EXPOSED).map(([o, why]) => `| \`${o}\` | ${why} |`),
    "",
  ].join("\n");
}

export function renderFrontendGuide(): string {
  const pages = new Map<string, { section: string; capability: Capability }[]>();
  for (const c of CAPABILITIES) {
    for (const f of c.frontend) pages.set(f.page, [...(pages.get(f.page) ?? []), { section: f.section, capability: c }]);
  }
  const order = (p: string) => (p.startsWith("(every") ? 0 : p.startsWith("/admin") ? 2 : 1);
  const sorted = [...pages.keys()].sort((a, b) => order(a) - order(b) || a.localeCompare(b));

  const page = (path: string) => {
    // One block per capability on the page: its sections, then its calls and notes.
    const grouped = new Map<string, { capability: Capability; sections: string[] }>();
    for (const { section, capability } of pages.get(path) ?? []) {
      const g = grouped.get(capability.id) ?? { capability, sections: [] };
      g.sections.push(section);
      grouped.set(capability.id, g);
    }
    return [
      `### ${path}`,
      "",
      ...[...grouped.values()].flatMap(({ capability: c, sections }) => [
        `**${c.title}** — ${sections.join("; ")}`,
        "",
        list([...code(c.endpoints).map((e) => `Call ${e}`), ...c.notes]),
        "",
      ]),
    ].join("\n");
  };

  return [
    GENERATED,
    "",
    "# Frontend data guide",
    "",
    "Page by page, every piece of data and every action the backend offers — so a redesign can't miss a capability that exists in the database. Pages marked *(proposed)* don't exist yet; their data and actions do. Rules a screen must respect are in each item's notes. The backend view of the same map is `docs/BACKEND-API-GUIDE.md`.",
    "",
    "## Public site",
    "",
    ...sorted.filter((p) => order(p) < 2).map(page),
    "## Admin",
    "",
    ...sorted.filter((p) => order(p) === 2).map(page),
    "## Every endpoint",
    "",
    "| Endpoint | Capability | Audience |",
    "|---|---|---|",
    ...CAPABILITIES.flatMap((c) => c.endpoints.map((e) => `| \`${e}\` | ${c.title} | ${c.audience} |`)),
    "",
  ].join("\n");
}
