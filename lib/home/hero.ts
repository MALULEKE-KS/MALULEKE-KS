// lib/home/hero.ts
// The home hero's copy and computed facts, as pure functions (docs/improvements/
// HOME-HERO-PLAN.md §6–7, D-036). **There is no wording in code.** Every figure
// comes from the database (the public ledger, the platform pulse); every label,
// claim and sentence is the owner's, read from the "home-hero" content block
// (seeded by migrations, edited in Admin → Page content). Where the block has
// no wording for a part, that part is not shown — nothing is invented in its
// place. A zero is never shown as proof, the statement carries no figure (a
// number in a sentence goes stale; the ledger's numbers are computed), and a
// build is only called "live" when it is the production deployment.

export type LedgerKey = "shipped" | "systems" | "rules" | "audited";

export interface LabelPair {
  one: string;
  many: string;
  /** The claim this figure proves, in the owner's words — shown above the figure (the statement's clauses, each with its live proof). */
  claim?: string;
}

/** The shape of the "home-hero" block's interface wording (lib/content/blocks.ts validates it). */
export interface HeroCopyBlock {
  primaryLabel?: string;
  secondaryLabel?: string;
  liveLabel?: string;
  previewLabel?: string;
  localLabel?: string;
  nowLabel?: string;
  stackLabel?: string;
  ledgerAria?: string;
  ledgerLabels?: Partial<Record<LedgerKey, LabelPair>>;
}

/** The owner's wording, or null where he has written none — a null part is simply not shown. */
export interface HeroCopy {
  primaryLabel: string | null;
  secondaryLabel: string | null;
  liveLabel: string | null;
  previewLabel: string | null;
  localLabel: string | null;
  nowLabel: string | null;
  stackLabel: string | null;
  ledgerAria: string | null;
  ledgerLabels: Partial<Record<LedgerKey, LabelPair>>;
}

const text = (value: string | undefined) => (value && value.trim() ? value : null);

/** Read the owner's wording from the block; anything he has not written stays null. */
export function heroCopy(block: HeroCopyBlock | null | undefined): HeroCopy {
  return {
    primaryLabel: text(block?.primaryLabel),
    secondaryLabel: text(block?.secondaryLabel),
    liveLabel: text(block?.liveLabel),
    previewLabel: text(block?.previewLabel),
    localLabel: text(block?.localLabel),
    nowLabel: text(block?.nowLabel),
    stackLabel: text(block?.stackLabel),
    ledgerAria: text(block?.ledgerAria),
    ledgerLabels: block?.ledgerLabels ?? {},
  };
}

export interface HeroLedgerInput {
  systemsShipped: number;
  systemsPublished: number;
  rulesEnforced: number;
  auditedThisWeek: number;
}

export interface HeroLedgerItem {
  key: LedgerKey;
  value: number;
  label: string;
  /** The claim this figure is the live proof of, or null for a supporting figure. */
  claim: string | null;
  /** The evidence claim key that backs this figure (docs/EVIDENCE-SPEC.md), where one exists. */
  evidenceKey: string | null;
}

/** Which evidence claim stands behind a figure — the same claims the control room had. */
export const HERO_EVIDENCE_KEYS: Record<LedgerKey, string | null> = {
  shipped: null,
  systems: null,
  rules: "pulse:rulesEnforcedByDatabase",
  audited: "pulse:auditEventsLast7Days",
};

const pick = (n: number, pair: LabelPair) => (n === 1 ? pair.one : pair.many);

/**
 * The record on the hero, built as the proof of the statement: the three claims
 * (runs in production, enforces its own rules, shows its proof) each over the
 * figure that proves it, then the catalogue size as a supporting figure. Only
 * figures above zero, and only those the owner has labelled — a figure with no
 * label is not shown, because a label is never made up for it.
 */
export function heroLedger(input: HeroLedgerInput, labels: Partial<Record<LedgerKey, LabelPair>>): HeroLedgerItem[] {
  const rows: [LedgerKey, number][] = [
    ["shipped", input.systemsShipped],
    ["rules", input.rulesEnforced],
    ["audited", input.auditedThisWeek],
    ["systems", input.systemsPublished],
  ];
  const items: HeroLedgerItem[] = [];
  for (const [key, value] of rows) {
    const pair = labels[key];
    if (value <= 0 || !pair) continue;
    items.push({ key, value, label: pick(value, pair), claim: pair.claim?.trim() || null, evidenceKey: HERO_EVIDENCE_KEYS[key] });
  }
  return items;
}

/**
 * The small line above the name, true to where the page is running: "live" only
 * for the production deployment, a preview label for a preview deployment, the
 * local label for a local build. Null when the owner has written no wording for
 * that case.
 */
export function heroLiveLine(
  deployment: { commit: string; environment: string | null } | null,
  copy: Pick<HeroCopy, "liveLabel" | "previewLabel" | "localLabel">,
  asOf: string,
): string | null {
  if (!deployment) return copy.localLabel;
  const template = deployment.environment === "production" ? copy.liveLabel : copy.previewLabel;
  return template ? template.replaceAll("{commit}", deployment.commit).replaceAll("{date}", asOf) : null;
}

/** Today's date for the live line, like "20 Oct 2026", in the site's time zone (setting `site.timeZone`); an unknown zone falls back to UTC. */
export function heroAsOf(now: Date, timeZone: string): string {
  const format = (tz: string) => now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: tz });
  try {
    return format(timeZone);
  } catch {
    return format("UTC");
  }
}

/** A skill as the evidence view gives it — only what the hero needs. */
export interface HeroSkill {
  name: string;
  categoryKey: string;
  systemCount: number;
}

/**
 * The technologies under the actions: skills from the chosen categories that at
 * least one system uses, the most used first (ties by name), at most `count`.
 * Categories come from a setting as comma-separated keys; none chosen, or a
 * count of 0, shows nothing.
 */
export function heroStack(skills: HeroSkill[], categoriesCsv: string, count: number): string[] {
  const categories = new Set(
    categoriesCsv
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean),
  );
  if (categories.size === 0 || count <= 0) return [];
  return skills
    .filter((s) => s.systemCount > 0 && categories.has(s.categoryKey.toLowerCase()))
    .sort((a, b) => b.systemCount - a.systemCount || a.name.localeCompare(b.name))
    .slice(0, count)
    .map((s) => s.name);
}

/**
 * The credential under the role — the first title that isn't the role itself
 * (a qualification, say), from the owner's own titles; null when there is none.
 */
export function heroCredential(titles: { label: string; detail: string | null }[], role: string): string | null {
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const other = titles.find((t) => !same(t.label, role));
  return other ? (other.detail ? `${other.label} · ${other.detail}` : other.label) : null;
}

/** The entrance's timing as CSS custom properties — durations are settings, never constants in a component. */
export function heroEntranceVars(durationMs: number, staggerMs: number): Record<"--hero-d" | "--hero-s", string> {
  return { "--hero-d": `${Math.max(0, durationMs)}ms`, "--hero-s": `${Math.max(0, staggerMs)}ms` };
}
