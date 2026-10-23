// components/systems/CatalogCard.tsx
// One system in the /systems catalog (PAGE-BUILD-PLAYBOOK §9), rebuilt in the
// premium pass (D-049, owner-approved 2026-10-23) on one anatomy, so every card
// in a row lines up:
//   a face drawn from the system's own data — its live site's real screenshot
//     (BR-1.18), else its 26 weeks of commits drawn large, else its technology
//     marks on graphite; never a stock image, so every card has the same top
//   status (and flagship) · name → · two lines · facts (domain · private repo)
//   · four technology marks then "+n" (kept with the last mark)
//   a footer that is always there: the activity line when it moved (nothing is
//     said when it didn't — WP-108: a finished system's quiet is not neglect)
//     and the card's action ("Case study" / "Open").
// One capsule (the status); the rest are words and marks. The whole card links
// to the system's page on this site (→, never ↗), on a Magic Card that lights
// under the pointer; a press answers a tap. A private repo shows a lock
// (BR-1.7). Data: lib/queries/catalog.ts.
//
// `layout="wide"` is the card for a home with one system (D2): the face on the
// left, the story on the right. On a phone every card is a compact row — a small
// square face beside the story — so the catalogue stays short (D-049).

import Link from "next/link";
import { activityText } from "@/lib/rules/activity";
import { ArrowRight, Lock, Star } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Sparkline } from "@/components/shared/Sparkline";
import { brandMark, techMark } from "@/components/shared/TechChip";
import type { CatalogSystem } from "@/lib/queries/catalog";
import { cn } from "@/lib/utils";

/** How many technologies a card names; the rest are counted (all of them are on the case study). */
const MARKS = 4;

/** The card's face: what the system really looks like, or the shape of its own work. */
function Face({ s, wide }: { s: CatalogSystem; wide: boolean }) {
  const moving = s.weeks.some((n) => n > 0);
  const frame = cn(
    "bg-night relative block overflow-hidden max-sm:aspect-square max-sm:rounded-xl",
    wide ? "sm:aspect-[16/9] md:aspect-auto md:h-full md:min-h-56" : "sm:aspect-[16/7]",
  );
  if (s.screenshotUrl) {
    return (
      <span className={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the screenshot route is ours, versioned by content hash */}
        <img
          src={s.screenshotUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-top transition-transform duration-700 ease-out group-hover/c:scale-[1.03] motion-reduce:transition-none"
        />
        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgb(11_12_14/0.22),transparent_55%)]" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={frame}>
      <span className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:linear-gradient(to_bottom,#000,transparent_85%)]" />
      <span className="absolute -top-12 -right-10 size-40 rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.18),transparent)]" />
      {moving ? (
        // Its 26 weeks of commits, drawn across the face — the work's own shape.
        <span className="absolute inset-x-2.5 top-2.5 bottom-3 flex flex-col sm:inset-x-5 sm:top-4 sm:bottom-5">
          <span className="text-mist hidden font-mono text-[11px] sm:block">26 weeks of commits</span>
          <Sparkline values={s.weeks} className="mt-auto h-[55%] w-full" />
        </span>
      ) : (
        // Nothing moved: what it is built with, as its marks.
        <span className="absolute inset-0 flex items-center justify-center gap-5 text-white/55">
          {s.tech.slice(0, 3).map((t, i) => (
            <span key={t} className={cn("grid place-items-center", i > 0 && "max-sm:hidden")}>
              {brandMark(t, "size-7") ?? <span className="font-mono text-xs">{t}</span>}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/** `showHome` is off when the card sits under its home's heading — said once, not twice. */
export function CatalogCard({ s, showHome = true, layout = "grid" }: { s: CatalogSystem; showHome?: boolean; layout?: "grid" | "wide" }) {
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
          // A phone: the small square face beside the story; wider: the face on top (or at the left, wide).
          "max-sm:grid-cols-[4.75rem_minmax(0,1fr)]",
          wide ? "sm:grid-cols-1 md:grid-cols-12" : "sm:grid-rows-[auto_1fr]",
        )}
      >
        <span className={cn("max-sm:pt-4 max-sm:pl-4", wide && "md:col-span-5")}>
          <Face s={s} wide={wide} />
        </span>

        <span className={cn("flex min-w-0 flex-col", wide && "md:col-span-7")}>
          <span className="flex flex-1 flex-col px-4 pt-4 sm:px-5 md:px-6 md:pt-5">
            <span className="flex items-center gap-2.5">
              <StatusBadge label={s.status} colorToken={s.statusColorToken} />
              {s.isFlagship && (
                <span className="text-accent inline-flex items-center gap-1 text-xs font-medium">
                  <Star aria-hidden="true" className="size-3 fill-current" /> Flagship
                </span>
              )}
            </span>

            <span className={cn("text-ink mt-3 flex items-start justify-between gap-3 font-semibold tracking-tight", wide ? "text-xl md:text-2xl" : "text-lg")}>
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
              <span className="text-ink/85 mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px]">
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
          <span className="border-ink/10 mx-4 mt-4 flex min-h-12 items-center gap-3 border-t py-3 sm:mx-5 md:mx-6">
            <span className="text-slate inline-flex min-w-0 flex-1 items-center gap-1.5 text-xs leading-snug">
              {s.commitsLast4Weeks > 0 && (
                // The card's one live indicator (PAGE-BUILD-PLAYBOOK §5): commits in the last four weeks.
                <span aria-hidden="true" className="relative flex size-1.5 shrink-0">
                  <span className="bg-ember absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" />
                  <span className="bg-ember relative inline-flex size-1.5 rounded-full" />
                </span>
              )}
              {/* Nothing moved: nothing is said (WP-108) — the footer still holds its place. */}
              <span className="min-w-0">{activity}</span>
            </span>
            <span className="text-ink group-hover/c:text-accent shrink-0 text-[13px] font-medium transition-colors">{s.hasCaseStudy ? "Case study" : "Open"}</span>
          </span>
        </span>
      </Link>
    </MagicCard>
  );
}
