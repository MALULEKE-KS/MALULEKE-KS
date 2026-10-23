// components/systems/CatalogCard.tsx
// One system in the /systems catalog (PAGE-BUILD-PLAYBOOK §9), rebuilt in the
// premium pass (D-049, owner-approved 2026-10-23) on one anatomy, so every card
// in a row ends on the same line:
//   [its live site's real screenshot, when it has one — BR-1.18, never a stock image]
//   status (and flagship) · name → · two lines · facts (domain · private repo)
//   · four technology marks then "+n" · a footer that is always there: 26 weeks
//   of commits and the activity line when it moved (nothing is said when it
//   didn't — WP-108: a finished system's quiet is not neglect) — and the
//   card's action ("Case study" / "Open").
// One capsule (the status); the rest are words and marks. The whole card links
// to the system's page on this site (→, never ↗), on a Magic Card that lights
// under the pointer; a press answers a tap. A private repo shows a lock
// (BR-1.7). Data: lib/queries/catalog.ts.
//
// `layout="wide"` is the card for a home with one system (D2): the picture on
// the left, the story on the right.

import Link from "next/link";
import { activityText } from "@/lib/rules/activity";
import { ArrowRight, Lock, Star } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Sparkline } from "@/components/shared/Sparkline";
import { techMark } from "@/components/shared/TechChip";
import type { CatalogSystem } from "@/lib/queries/catalog";
import { cn } from "@/lib/utils";

/** How many technologies a card names; the rest are counted (all of them are on the case study). */
const MARKS = 4;

/** The live site's screenshot, as the card's top — loaded when it nears the screen. */
function Shot({ s, wide }: { s: CatalogSystem; wide: boolean }) {
  return (
    <span className={cn("bg-night relative block overflow-hidden", wide ? "aspect-[16/9] md:aspect-auto md:h-full" : "aspect-[16/7]")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the screenshot route is ours, versioned by content hash */}
      <img
        src={s.screenshotUrl!}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover object-top transition-transform duration-700 ease-out group-hover/c:scale-[1.03] motion-reduce:transition-none"
      />
      <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgb(11_12_14/0.22),transparent_55%)]" />
    </span>
  );
}

/** `showHome` is off when the card sits under its home's heading — said once, not twice. */
export function CatalogCard({ s, showHome = true, layout = "grid" }: { s: CatalogSystem; showHome?: boolean; layout?: "grid" | "wide" }) {
  const moving = s.weeks.some((n) => n > 0);
  const activity = activityText(s);
  const wide = layout === "wide";
  const facts = [showHome && s.home ? s.home : null, s.domain].filter((f): f is string => Boolean(f));
  const extra = s.tech.length - MARKS;
  return (
    <MagicCard className="shadow-soft hover:shadow-lift h-full rounded-[1.5rem] transition-shadow duration-500" surface="var(--color-sheet)" spotlight="rgb(255 91 31 / 0.05)">
      <Link
        href={`/systems/${s.slug}`}
        className={cn(
          "group/c press focus-visible:outline-ember grid h-full overflow-hidden rounded-[1.5rem] focus-visible:outline-2 focus-visible:outline-offset-2",
          wide && s.screenshotUrl ? "grid-cols-1 md:grid-cols-12" : "grid-rows-[auto_1fr]",
        )}
      >
        {s.screenshotUrl ? <span className={cn(wide && "md:col-span-5")}><Shot s={s} wide={wide} /></span> : <span aria-hidden="true" />}

        <span className={cn("flex min-w-0 flex-col", wide && s.screenshotUrl && "md:col-span-7")}>
          <span className="flex flex-1 flex-col px-5 pt-5 md:px-6 md:pt-6">
            <span className="flex items-center gap-2.5">
              <StatusBadge label={s.status} colorToken={s.statusColorToken} />
              {s.isFlagship && (
                <span className="text-accent inline-flex items-center gap-1 text-xs font-medium">
                  <Star aria-hidden="true" className="size-3 fill-current" /> Flagship
                </span>
              )}
            </span>

            <span className={cn("text-ink mt-4 flex items-start justify-between gap-3 font-semibold tracking-tight", wide ? "text-xl md:text-2xl" : "text-lg")}>
              <span className="min-w-0 [overflow-wrap:anywhere]">{s.name}</span>
              <ArrowRight aria-hidden="true" className="text-slate group-hover/c:text-accent mt-1 size-4 shrink-0 transition-[transform,color] duration-300 group-hover/c:translate-x-0.5 motion-reduce:transition-none" />
            </span>
            {s.description && <span className={cn("text-slate mt-1.5 text-sm leading-relaxed", wide ? "line-clamp-3 md:text-[15px]" : "line-clamp-2")}>{s.description}</span>}

            {(facts.length > 0 || s.repoPrivate) && (
              <span className="text-slate/85 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] [&>*+*]:before:mr-2 [&>*+*]:before:content-['·']">
                {facts.map((f) => (
                  <span key={f}>{f}</span>
                ))}
                {s.repoPrivate && (
                  <span className="inline-flex items-center gap-1">
                    <Lock aria-hidden="true" className="size-3" /> Private repo
                  </span>
                )}
              </span>
            )}

            {s.tech.length > 0 && (
              <span className="text-ink/85 mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px]">
                {s.tech.slice(0, MARKS).map((t, i, shown) => (
                  <span key={t} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    {techMark(t)}
                    {t}
                    {/* The count rides with the last mark, so it never wraps onto a line of its own. */}
                    {i === shown.length - 1 && extra > 0 && (
                      <span title={s.tech.slice(MARKS).join(", ")} className="text-slate ml-0.5 font-mono text-xs">
                        +{extra}
                      </span>
                    )}
                  </span>
                ))}
              </span>
            )}
          </span>

          {/* Always there, so every card in a row ends on the same line. */}
          <span className="border-ink/10 mx-5 mt-5 flex min-h-14 items-center gap-3 border-t py-3.5 md:mx-6">
            {moving && <Sparkline values={s.weeks} className="w-20 shrink-0" />}
            <span className="text-slate min-w-0 flex-1 text-xs leading-snug">
              {moving ? (
                <>
                  <span className="text-ink/75 block font-mono text-[11px]">26 weeks of commits</span>
                  <span className="inline-flex items-center gap-1.5">
                    {s.commitsLast4Weeks > 0 && (
                      // The card's one live indicator (PAGE-BUILD-PLAYBOOK §5): commits in the last four weeks.
                      <span aria-hidden="true" className="relative flex size-1.5 shrink-0">
                        <span className="bg-ember absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" />
                        <span className="bg-ember relative inline-flex size-1.5 rounded-full" />
                      </span>
                    )}
                    {activity}
                  </span>
                </>
              ) : (
                // Nothing moved: say nothing rather than advertise a quiet that isn't neglect (WP-108) —
                // the footer still holds its place, so the row lines up.
                activity
              )}
            </span>
            <span className="text-ink group-hover/c:text-accent shrink-0 text-[13px] font-medium transition-colors">{s.hasCaseStudy ? "Case study" : "Open"}</span>
          </span>
        </span>
      </Link>
    </MagicCard>
  );
}
