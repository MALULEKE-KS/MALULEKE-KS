// docs/EVIDENCE-SPEC.md EV-3 — no broken evidence ships. The published
// evidence block (seeded by its migration) is read from the database and
// every link is resolved against this very checkout: repository paths must
// exist, site routes must be real pages, workflows must exist. A renamed or
// deleted file fails the build before a visitor can meet the dead link.

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { EvidenceBlock } from "@/lib/evidence/schema";

const ROOT = process.cwd();

/** Every page route in app/, as a matcher: (groups) dropped, [param] → one segment. */
function pageRoutes(): RegExp[] {
  const out: RegExp[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/^page\.(tsx|ts|jsx|js|mdx)$/.test(name)) {
        const segs = relative(join(ROOT, "app"), dir)
          .split(sep)
          .filter((s) => s && !/^\(.*\)$/.test(s));
        const pattern = segs.map((s) => (/^\[\[?\.\.\./.test(s) ? ".+" : /^\[.*\]$/.test(s) ? "[^/]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/");
        out.push(new RegExp(`^/${pattern}/?$`));
      }
    }
  };
  walk(join(ROOT, "app"));
  return out;
}

describe("EV-3 — every published evidence link resolves", async () => {
  const row = await db.siteContent.findUnique({ where: { key: "evidence" } });
  const parsed = EvidenceBlock.safeParse(row?.body);
  const routes = pageRoutes();

  it("the evidence block exists and is valid", () => {
    expect(row).not.toBeNull();
    expect(parsed.success).toBe(true);
  });

  const links = parsed.success ? parsed.data.claims.flatMap((c) => c.evidence.map((e) => ({ claim: c.id, href: e.href }))) : [];

  it.each(links)("$claim → $href", ({ href }) => {
    if (href.startsWith("repo:")) {
      expect(existsSync(join(ROOT, href.slice(5)))).toBe(true);
    } else if (href.startsWith("actions:")) {
      expect(existsSync(join(ROOT, ".github", "workflows", href.slice(8)))).toBe(true);
    } else {
      const path = href.split("#")[0]!;
      expect(routes.some((r) => r.test(path))).toBe(true);
    }
  });
});
