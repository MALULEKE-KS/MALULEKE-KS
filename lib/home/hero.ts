// lib/home/hero.ts
// The home hero's copy and computed facts, as pure functions (docs/improvements/
// HOME-HERO-PLAN.md §6–7). Every figure comes from the database (the public
// ledger, the platform pulse); every label is the owner's, read from the
// "home-hero" content block — the wording below is only the fallback a page
// shows until a label is written (D-010). A zero is never shown as proof.

export type LedgerKey = "systems" | "rules" | "audited" | "organisations";

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
  ledgerAria?: string;
  ledgerLabels?: Record<LedgerKey, LabelPair>;
}

export interface HeroCopy {
  primaryLabel: string;
  secondaryLabel: string;
  liveLabel: string;
  localLabel: string;
  ledgerAria: string;
  ledgerLabels: Record<LedgerKey, LabelPair>;
}

/** Shipped wording — a fallback only; the owner's block wins field by field. */
export const DEFAULT_HERO_COPY: HeroCopy = {
  primaryLabel: "See the work",
  secondaryLabel: "Ask the guide",
  liveLabel: "Live · build {commit}",
  localLabel: "Local development build",
  ledgerAria: "The record, live",
  ledgerLabels: {
    systems: { one: "system published", many: "systems published" },
    rules: { one: "rule the database enforces", many: "rules the database enforces" },
    audited: { one: "change audited this week", many: "changes audited this week" },
    organisations: { one: "organisation founded", many: "organisations founded" },
  },
};

const text = (value: string | undefined, fallback: string) => (value && value.trim() ? value : fallback);

/** The owner's wording where written, the shipped wording where not. */
export function heroCopy(block: HeroCopyBlock | null | undefined): HeroCopy {
  const d = DEFAULT_HERO_COPY;
  return {
    primaryLabel: text(block?.primaryLabel, d.primaryLabel),
    secondaryLabel: text(block?.secondaryLabel, d.secondaryLabel),
    liveLabel: text(block?.liveLabel, d.liveLabel),
    localLabel: text(block?.localLabel, d.localLabel),
    ledgerAria: text(block?.ledgerAria, d.ledgerAria),
    ledgerLabels: block?.ledgerLabels ?? d.ledgerLabels,
  };
}

export interface HeroLedgerInput {
  systemsPublished: number;
  rulesEnforced: number;
  auditedThisWeek: number;
  organisations: number;
}

export interface HeroLedgerItem {
  key: LedgerKey;
  value: number;
  label: string;
  /** The evidence claim key that backs this figure (docs/EVIDENCE-SPEC.md), where one exists. */
  evidenceKey: string | null;
}

/** Which evidence claim stands behind a figure — the same claims the control room carries. */
export const HERO_EVIDENCE_KEYS: Record<LedgerKey, string | null> = {
  systems: null,
  rules: "pulse:rulesEnforcedByDatabase",
  audited: "pulse:auditEventsLast7Days",
  organisations: null,
};

const pick = (n: number, pair: LabelPair) => (n === 1 ? pair.one : pair.many);

/** The record under the hero: only figures above zero, each labelled to agree with its number. */
export function heroLedger(input: HeroLedgerInput, labels: Record<LedgerKey, LabelPair> = DEFAULT_HERO_COPY.ledgerLabels): HeroLedgerItem[] {
  const rows: [LedgerKey, number][] = [
    ["systems", input.systemsPublished],
    ["rules", input.rulesEnforced],
    ["audited", input.auditedThisWeek],
    ["organisations", input.organisations],
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
