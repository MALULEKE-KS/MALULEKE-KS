// lib/xray/copy.ts
// The receipt's and the X-ray's words (D-067): the owner's "page-xray" block, read as it is —
// a label he leaves empty hides its part (the hero's rule, lib/home/hero.ts). And the edge
// regions by name: Vercel's own region codes, a fixed list of the vendor's, so a code the list
// doesn't know is shown as it is.

import type { ContentBody } from "@/lib/content/blocks";
import type { XrayStatus } from "@/lib/xray/build";

type Block = ContentBody<"page-xray">;

const text = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export interface ReceiptCopy {
  receiptLabel: string | null;
  renderedLabel: string | null;
  firstByteLabel: string | null;
  edgeLabel: string | null;
  cacheLabel: string | null;
  buildLabel: string | null;
  rulesLabel: string | null;
}

export interface XrayCopy {
  switchLabel: string;
  onLabel: string | null;
  offLabel: string | null;
  intro: string | null;
  showsLabel: string | null;
  readsLabel: string | null;
  servedLabel: string | null;
  rulesHeading: string | null;
  sourceLabel: string | null;
  statusLabels: Partial<Record<XrayStatus, string>>;
  sectionLabels: Record<string, string>;
}

export function receiptCopy(block: Block | null): ReceiptCopy {
  return {
    receiptLabel: text(block?.receiptLabel),
    renderedLabel: text(block?.renderedLabel),
    firstByteLabel: text(block?.firstByteLabel),
    edgeLabel: text(block?.edgeLabel),
    cacheLabel: text(block?.cacheLabel),
    buildLabel: text(block?.buildLabel),
    rulesLabel: text(block?.rulesLabel),
  };
}

/** Null when the owner has written no switch label: the X-ray is off. */
export function xrayCopy(block: Block | null): XrayCopy | null {
  const switchLabel = text(block?.switchLabel);
  if (!switchLabel) return null;
  return {
    switchLabel,
    onLabel: text(block?.onLabel),
    offLabel: text(block?.offLabel),
    intro: text(block?.intro),
    showsLabel: text(block?.showsLabel),
    readsLabel: text(block?.readsLabel),
    servedLabel: text(block?.servedLabel),
    rulesHeading: text(block?.rulesHeading),
    sourceLabel: text(block?.sourceLabel),
    statusLabels: block?.statusLabels ?? {},
    sectionLabels: block?.sectionLabels ?? {},
  };
}

/** A template with its one {placeholder} filled; null when the owner wrote none. */
export function fill(template: string | null, key: string, value: string | number): string | null {
  return template ? template.replaceAll(`{${key}}`, String(value)) : null;
}

/** When a copy of the page was rendered, like "14:05 SAST", in the site's zone (setting `site.timeZone`); an unknown zone falls back to UTC. */
export function renderedAt(now: Date, timeZone: string): string {
  const format = (tz: string) =>
    now.toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
      timeZoneName: "short",
    });
  try {
    return format(timeZone);
  } catch {
    return format("UTC");
  }
}

const REGIONS: Record<string, string> = {
  arn1: "Stockholm",
  bom1: "Mumbai",
  cdg1: "Paris",
  cle1: "Cleveland",
  cpt1: "Cape Town",
  dub1: "Dublin",
  dxb1: "Dubai",
  fra1: "Frankfurt",
  gru1: "São Paulo",
  hkg1: "Hong Kong",
  hnd1: "Tokyo",
  iad1: "Washington, D.C.",
  icn1: "Seoul",
  kix1: "Osaka",
  lhr1: "London",
  pdx1: "Portland",
  sfo1: "San Francisco",
  sin1: "Singapore",
  syd1: "Sydney",
  yul1: "Montréal",
};

/** The edge that answered, from Vercel's x-vercel-id ("cpt1::iad1::…" → "Cape Town (cpt1)"); null without one. */
export function edgeRegion(vercelId: string | null): string | null {
  const code = vercelId?.split("::")[0]?.trim().toLowerCase();
  if (!code || !/^[a-z]{3}\d$/.test(code)) return null;
  return REGIONS[code] ? `${REGIONS[code]} (${code})` : code;
}
