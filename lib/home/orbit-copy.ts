// lib/home/orbit-copy.ts
// The Orbit's words (D-069): the owner's "home-orbit" block, read as it is — a label he leaves
// empty hides its part (the hero's rule, lib/home/hero.ts). Templates are filled where they show.

import type { ContentBody } from "@/lib/content/blocks";

type Block = ContentBody<"home-orbit">;
const KEYS = [
  "ariaLabel",
  "statsLine",
  "hint",
  "legendFlagship",
  "legendSystem",
  "legendActive",
  "legendSpark",
  "ignitingLine",
  "weekLine",
  "busiestLine",
  "restLine",
  "replayLabel",
  "weekButton",
  "nowLabel",
  "flagshipLabel",
  "activeNote",
  "commitsLabel",
  "openLabel",
  "prevLabel",
  "nextLabel",
  "closeLabel",
  "exploreLabel",
  "exploreHint",
  "phoneEyebrow",
  "phoneHint",
  "factBusiest",
  "busiestValue",
  "factQuiet",
  "factShare",
  "shareValue",
  "factLinked",
  "touchHint",
  "pointerHint",
  "enterLabel",
  "backLabel",
  "insideLine",
  "coreLabel",
  "coreSub",
  "playLabel",
] as const satisfies readonly (keyof Block)[];

export type OrbitCopy = Record<(typeof KEYS)[number], string | null>;

export function orbitCopy(block: Block | null): OrbitCopy {
  return Object.fromEntries(KEYS.map((k) => [k, block?.[k]?.trim() || null])) as OrbitCopy;
}

/** A template with its {placeholders} filled; null when the owner wrote none. */
export function fillIn(
  template: string | null,
  values: Record<string, string | number>
): string | null {
  if (!template) return null;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}
