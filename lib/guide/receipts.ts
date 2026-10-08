// lib/guide/receipts.ts
// Receipts (docs/AI-GUIDE-PHASE1-PLAN.md §6): the records an answer used,
// shown under it. Taken from the site links the answer wrote and from the
// guide's own tool results, then checked against the site's index — a link
// to a system or a journey entry that doesn't exist is never shown as a
// receipt. Pure, so it's tested without a browser.

import type { UIMessage } from "ai";

export interface GuideSiteIndex {
  /** Published systems (PublicSystem). */
  systems: { slug: string; name: string }[];
  /** Journey moments, by the id the /journey page anchors (#entry-<id>). */
  journey: { id: string; title: string }[];
  /** The site's own top-level pages. */
  pages: { path: string; label: string }[];
}

export type ReceiptKind = "system" | "journey" | "page";
export interface Receipt {
  kind: ReceiptKind;
  label: string;
  href: string;
}

const MAX_RECEIPTS = 8;
// A site path the guide wrote: on its own, or as a [label](/path) link.
const PATH = /(?<![\w/.:])\/(?:[a-z0-9-]+)(?:\/[a-z0-9-]+)*(?:#[a-z0-9-]+)?/gi;

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** One site path → the record it points at, or null when there's no such thing on the site. */
export function resolvePath(path: string, index: GuideSiteIndex): Receipt | null {
  const [pathname, hash] = path.split("#") as [string, string | undefined];
  const clean = pathname.replace(/\/+$/, "") || "/";
  const system = clean.match(/^\/systems\/([a-z0-9-]+)$/i);
  if (system) {
    const found = index.systems.find((s) => s.slug === system[1]!.toLowerCase());
    return found ? { kind: "system", label: found.name, href: `/systems/${found.slug}` } : null;
  }
  const page = index.pages.find((p) => p.path === clean);
  if (!page) return null;
  if (clean === "/journey" && hash?.startsWith("entry-")) {
    const moment = index.journey.find((m) => m.id === hash.slice("entry-".length));
    return moment ? { kind: "journey", label: moment.title, href: `/journey#entry-${moment.id}` } : { kind: "page", label: page.label, href: page.path };
  }
  return hash ? { kind: "page", label: `${page.label} · ${titleCase(hash)}`, href: `${page.path}#${hash}` } : { kind: "page", label: page.label, href: page.path };
}

type Part = UIMessage["parts"][number] & { state?: string; output?: unknown; text?: string };

/** Every record an answer used: its tool results first (they're what it looked at), then its links. */
export function receiptsOf(message: UIMessage, index: GuideSiteIndex): Receipt[] {
  const paths: string[] = [];
  for (const raw of message.parts) {
    const p = raw as Part;
    if (p.state !== "output-available" || !p.output) continue;
    if (p.type === "tool-show_systems" && Array.isArray(p.output)) paths.push(...(p.output as { href: string }[]).map((c) => c.href));
    if (p.type === "tool-search_systems" && Array.isArray(p.output)) paths.push(...(p.output as { path: string }[]).map((r) => r.path));
    if (p.type === "tool-show_skills" && Array.isArray(p.output)) paths.push(...(p.output as { systems: { slug: string }[] }[]).flatMap((c) => c.systems.map((s) => `/systems/${s.slug}`)));
    if (p.type === "tool-show_journey") paths.push(...((p.output as { moments?: { href: string | null }[] }).moments ?? []).flatMap((m) => (m.href ? [m.href] : [])));
  }
  for (const raw of message.parts) {
    const p = raw as Part;
    if (p.type === "text" && p.text) paths.push(...(p.text.match(PATH) ?? []));
  }
  const seen = new Set<string>();
  const out: Receipt[] = [];
  for (const path of paths) {
    const r = typeof path === "string" ? resolvePath(path, index) : null;
    if (!r || seen.has(r.href)) continue;
    seen.add(r.href);
    out.push(r);
    if (out.length === MAX_RECEIPTS) break;
  }
  return out;
}
