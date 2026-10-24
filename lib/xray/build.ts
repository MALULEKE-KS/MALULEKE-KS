// lib/xray/build.ts
// Builds the X-ray's manifest (D-067): for each section of a page, the capabilities it
// shows — their database objects, endpoints and business rules, straight from the
// capability map — and, for every rule named, what docs/ENFORCEMENT-REGISTER.md says
// about it: the claim, where it is held, and its status. Pure and deterministic, so
// tests/unit/xray.test.ts can prove the committed manifest is current. Written by
// `npm run docs:capabilities` (scripts/generate-capability-docs.ts).

import { CAPABILITIES } from "@/lib/capabilities/map";
import { XRAY_PAGES } from "@/lib/xray/sections";

export type XrayStatus = "enforced" | "partial" | "missing" | "building" | "deferred";

export interface XrayRuleRow {
  claim: string;
  /** Where it is held — the register's "Target" column, or its own words when the table has none. */
  layer: string | null;
  status: XrayStatus;
}

export interface XrayCapability {
  id: string;
  title: string;
  summary: string;
  db: string[];
  endpoints: string[];
  rules: string[];
  /** What this capability puts in the section, as the map says it. */
  shows: string[];
}

export interface XraySectionManifest {
  key: string;
  source: string;
  capabilities: XrayCapability[];
}

export interface XrayManifest {
  page: string;
  sections: XraySectionManifest[];
  /** Every rule the page's capabilities name, as the register states it (several rows when it has several). */
  rules: Record<string, XrayRuleRow[]>;
}

const STATUS: [string, XrayStatus][] = [
  ["✅", "enforced"],
  ["🟡", "partial"],
  ["❌", "missing"],
  ["🚧", "building"],
  ["⏳", "deferred"],
];

/** Markdown to one plain line: no emphasis, code ticks or link targets; cut at a word near `max`. */
export function plain(md: string, max = 240): string {
  const text = md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*|__|`/g, "")
    .replace(/(^|\s)\*([^*]+)\*/g, "$1$2")
    .replace(/<br\s*\/?>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[,;:—–-]\s*$/, "")}…`;
}

/** "BR-4.1, 4.2, 4.4" · "LT-1/2" · "BR-2.1 / LT-6" · "BR-4.3 (measured), BR-5.2" → the rule ids, qualifiers dropped. */
export function ruleIds(cell: string): string[] {
  const ids: string[] = [];
  let family: string | null = null;
  for (const raw of cell.replace(/\([^)]*\)/g, "").split(/[,/]/)) {
    const token = raw.trim();
    const full = /^([A-Z]{2,4})-(\d+(?:\.\d+)*)$/.exec(token);
    if (full) {
      family = full[1]!;
      ids.push(token);
    } else if (family && /^\d+(?:\.\d+)*$/.test(token)) {
      ids.push(`${family}-${token}`);
    }
  }
  return ids;
}

/** The register's rule rows, keyed by rule id. Tables whose first column isn't a rule are skipped. */
export function parseRegister(md: string): Record<string, XrayRuleRow[]> {
  const rules: Record<string, XrayRuleRow[]> = {};
  let header: string[] = [];
  for (const line of md.split(/\r?\n/)) {
    if (!line.startsWith("|")) {
      header = [];
      continue;
    }
    const cells = line
      .replace(/^\|/, "")
      .replace(/\|\s*$/, "")
      .split(" | ")
      .map((c) => c.trim());
    if (header.length === 0) {
      header = cells;
      continue;
    }
    if (/^-+$/.test(cells[0]!.replace(/[|:\s]/g, "")) || header[0] !== "Rule") continue;
    const ids = ruleIds(cells[0]!);
    if (ids.length === 0) continue;
    const statusAt = header.indexOf("Status");
    const statusCell = cells[statusAt] ?? "";
    const status = STATUS.find(([mark]) => statusCell.includes(mark))?.[1];
    if (!status) continue;
    const targetAt = header.indexOf("Target");
    const layer =
      targetAt >= 0
        ? plain(cells[targetAt] ?? "", 80) || null
        : plain(statusCell.replace(/^\S+\s*/, ""), 140) || null;
    const row: XrayRuleRow = {
      claim: plain(cells[1] ?? ""),
      layer: layer === "—" ? null : layer,
      status,
    };
    for (const id of ids) (rules[id] ??= []).push(row);
  }
  return rules;
}

/** The manifest for one page the X-ray covers. */
export function buildXray(page: string, register: string): XrayManifest {
  const sections = XRAY_PAGES[page];
  if (!sections) throw new Error(`The X-ray doesn't cover ${page} (lib/xray/sections.ts)`);
  const known = parseRegister(register);
  const rules: Record<string, XrayRuleRow[]> = {};
  const built = sections.map(({ key, source }) => {
    const capabilities: XrayCapability[] = [];
    for (const c of CAPABILITIES) {
      if (c.audience !== "public") continue;
      const shows = c.frontend
        .filter((f) => f.page === page && f.xray === key)
        .map((f) => f.section);
      if (shows.length === 0) continue;
      capabilities.push({
        id: c.id,
        title: c.title,
        summary: plain(c.summary, 260),
        db: c.db,
        endpoints: c.endpoints,
        rules: c.rules,
        shows,
      });
      for (const r of c.rules) if (known[r]) rules[r] = known[r]!;
    }
    return { key, source, capabilities };
  });
  return {
    page,
    sections: built,
    rules: Object.fromEntries(
      Object.entries(rules).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
    ),
  };
}
