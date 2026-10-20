// lib/home/hero.ts
// The home hero's copy and computed facts, as pure functions (docs/improvements/
// HOME-HERO-PLAN.md §6–7). Every figure comes from the database (the public
// ledger, the platform pulse); every label is the owner's, read from the
// "home-hero" content block — the wording below is only the fallback a page
// shows until a label is written (D-010). A zero is never shown as proof, and
// the statement carries no figure (a number in a sentence goes stale; the
// ledger's numbers are computed).

export type LedgerKey = "shipped" | "systems" | "rules" | "audited";

export interface LabelPair {
  one: string;
  many: string;
}

/** The shape of the "home-hero" block's interface wording (lib/content/blocks.ts validates it). */
export interface HeroCopyBlock {
  primaryLabel?: string;
  secondaryLabel?: string;
  liveLabel?: string;
  localLabel?: string;
  nowLabel?: string;
  ledgerAria?: string;
  ledgerLabels?: Partial<Record<LedgerKey, LabelPair>>;
}

export interface HeroCopy {
  primaryLabel: string;
  secondaryLabel: string;
  liveLabel: string;
  localLabel: string;
  nowLabel: string;
  ledgerAria: string;
  ledgerLabels: Record<LedgerKey, LabelPair>;
}

/** Shipped wording — a fallback only; the owner's block wins field by field. */
export const DEFAULT_HERO_COPY: HeroCopy = {
  primaryLabel: "See the work",
  secondaryLabel: "Ask the guide",
  liveLabel: "Live · build {commit}",
  localLabel: "Local development build",
  nowLabel: "Building now",
  ledgerAria: "The record, live",
  ledgerLabels: {
    shipped: { one: "system shipped to production", many: "systems shipped to production" },
    systems: { one: "system published", many: "systems published" },
    rules: { one: "rule the database enforces", many: "rules the database enforces" },
    audited: { one: "change audited this week", many: "changes audited this week" },
  },
};

const text = (value: string | undefined, fallback: string) => (value && value.trim() ? value : fallback);

/** The owner's wording where written, the shipped wording where not (per label, too). */
export function heroCopy(block: HeroCopyBlock | null | undefined): HeroCopy {
  const d = DEFAULT_HERO_COPY;
  const labels = { ...d.ledgerLabels };
  for (const key of Object.keys(labels) as LedgerKey[]) labels[key] = block?.ledgerLabels?.[key] ?? labels[key];
  return {
    primaryLabel: text(block?.primaryLabel, d.primaryLabel),
    secondaryLabel: text(block?.secondaryLabel, d.secondaryLabel),
    liveLabel: text(block?.liveLabel, d.liveLabel),
    localLabel: text(block?.localLabel, d.localLabel),
    nowLabel: text(block?.nowLabel, d.nowLabel),
    ledgerAria: text(block?.ledgerAria, d.ledgerAria),
    ledgerLabels: labels,
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

/** The record on the hero: only figures above zero, each labelled to agree with its number. */
export function heroLedger(input: HeroLedgerInput, labels: Record<LedgerKey, LabelPair> = DEFAULT_HERO_COPY.ledgerLabels): HeroLedgerItem[] {
  const rows: [LedgerKey, number][] = [
    ["shipped", input.systemsShipped],
    ["systems", input.systemsPublished],
    ["rules", input.rulesEnforced],
    ["audited", input.auditedThisWeek],
  ];
  return rows
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ key, value, label: pick(value, labels[key]), evidenceKey: HERO_EVIDENCE_KEYS[key] }));
}

/** The small line above the name: the build that is running, or an honest local-development label. */
export function heroLiveLine(deployment: { commit: string } | null, copy: Pick<HeroCopy, "liveLabel" | "localLabel"> = DEFAULT_HERO_COPY): string {
  return deployment ? copy.liveLabel.replaceAll("{commit}", deployment.commit) : copy.localLabel;
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

/**
 * Whether the rebuilt hero shows: the flag, or — outside production only — the
 * preview switch `/?hero=v2`, so the owner (and the tests) can see it before the
 * flag is switched on. A visitor to the production site can never reach it early.
 */
export function heroV2Active(input: { flagOn: boolean; preview: string | string[] | undefined; environment: string | undefined }): boolean {
  if (input.flagOn) return true;
  const preview = Array.isArray(input.preview) ? input.preview[0] : input.preview;
  return preview === "v2" && input.environment !== "production";
}

/** The entrance's timing as CSS custom properties — durations are settings, never constants in a component. */
export function heroEntranceVars(durationMs: number, staggerMs: number): Record<"--hero-d" | "--hero-s", string> {
  return { "--hero-d": `${Math.max(0, durationMs)}ms`, "--hero-s": `${Math.max(0, staggerMs)}ms` };
}
