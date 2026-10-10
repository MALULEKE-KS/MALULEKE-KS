// lib/guide/tour.ts
// Guided tours (docs/AI-GUIDE-PHASE2-PLAN.md §7). The guide can walk a visitor through
// the site: open a page, scroll to a section, light it up, say one line about it.
// Everything a tour contains — which tours exist, their stops, what each stop says,
// how long a section stays lit — is the owner's content (the "guide-tours" block). The
// model only chooses *which* tour; it cannot add a stop, a page or a word. A stop on a
// page that isn't one of the site's own is dropped, so a tour never leaves the site.

import { z } from "zod";

const Line = (max: number) => z.string().trim().min(1).max(max);
const SitePath = z.string().trim().regex(/^\/(?!\/)[a-z0-9\-/]*$/, "a site path such as /systems");

export const TourStop = z.object({
  path: SitePath,
  /** A section on that page (its heading or id), e.g. "skills". */
  section: z.string().trim().max(60).optional(),
  say: Line(220),
});

export const TourDef = z.object({
  key: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "letters, digits and dashes").max(40),
  label: Line(60),
  summary: Line(160),
  stops: z.array(TourStop).min(1).max(10),
});

export const ToursBlock = z.object({
  tours: z.array(TourDef).max(8),
  /** How long a section stays lit after the tour moves to it. */
  spotlightSeconds: z.number().int().min(1).max(15),
});

export type TourBlockData = z.infer<typeof ToursBlock>;

export interface ResolvedStop {
  href: string;
  /** The page, for display. */
  path: string;
  /** The section's anchor id, when there is one. */
  anchor: string | null;
  say: string;
}

export interface ResolvedTour {
  key: string;
  label: string;
  summary: string;
  stops: ResolvedStop[];
  spotlightSeconds: number;
}

/** The anchor id a section name points at: "How I build" → "how-i-build". */
export const anchorOf = (section: string) => section.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A tour as the visitor gets it: only stops on pages the site really has. Null when nothing is left. */
export function resolveTour(block: TourBlockData | null, key: string, sitePaths: string[]): ResolvedTour | null {
  const tour = block?.tours.find((t) => t.key === key);
  if (!block || !tour) return null;
  const known = new Set(sitePaths);
  const stops = tour.stops.flatMap((s): ResolvedStop[] => {
    const path = s.path.replace(/\/+$/, "") || "/";
    if (!known.has(path)) return [];
    const anchor = s.section ? anchorOf(s.section) || null : null;
    return [{ href: anchor ? `${path}#${anchor}` : path, path, anchor, say: s.say }];
  });
  return stops.length ? { key: tour.key, label: tour.label, summary: tour.summary, stops, spotlightSeconds: block.spotlightSeconds } : null;
}

/** Which tour keys the model may choose from. */
export const tourKeys = (block: TourBlockData | null) => block?.tours.map((t) => t.key) ?? [];

/** Moving through a tour lives in tour-step.ts, which the browser can load without zod. */
export { stepTo } from "@/lib/guide/tour-step";
