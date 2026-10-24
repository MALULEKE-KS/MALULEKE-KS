// lib/xray/copy.ts
// The X-ray's words (D-067; in How it all connects since D-069): the owner's "page-xray" block,
// read as it is — a label he leaves empty hides its part (the hero's rule, lib/home/hero.ts).
// The block's receipt labels are unused since the receipt left the hero (D-069).

import type { ContentBody } from "@/lib/content/blocks";
import type { XrayStatus } from "@/lib/xray/build";

type Block = ContentBody<"page-xray">;

const text = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

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
