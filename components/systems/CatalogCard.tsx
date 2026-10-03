// components/systems/CatalogCard.tsx
// One system in the /systems catalog (PAGE-BUILD-PLAYBOOK §9): status, name,
// what it is, where it lives, what it's built with, and whether it's moving —
// on a Magic Card that lights up under the pointer. A private repo shows a
// lock (BR-1.7); a written case study gets a badge; the whole card links to
// the system's page. Data: lib/queries/catalog.ts.

import Link from "next/link";
import { activityText } from "@/lib/rules/activity";
import { ArrowUpRight, BookOpenText, Lock, Star } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Sparkline } from "@/components/shared/Sparkline";
import { TechChip } from "@/components/shared/TechChip";
import type { CatalogSystem } from "@/lib/queries/catalog";

/** `showHome` is off when the card sits under its home's heading — said once, not twice. */
export function CatalogCard({ s, showHome = true }: { s: CatalogSystem; showHome?: boolean }) {
  const moving = s.weeks.some((n) => n > 0);
  return (
    <MagicCard
      className="shadow-soft h-full rounded-3xl"
      surface="var(--color-sheet)"
      spotlight="rgb(255 91 31 / 0.05)"
    >
      <Link
        href={`/systems/${s.slug}`}
        className="group/c focus-visible:outline-ember flex h-full flex-col p-5 focus-visible:outline-2 focus-visible:outline-offset-2 md:p-6"
      >
        <span className="flex items-center justify-between gap-2">
          <StatusBadge label={s.status} colorToken={s.statusColorToken} />
          <span className="flex items-center gap-1.5">
            {s.isFlagship && (
              <span className="bg-ember/10 text-accent inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
                <Star aria-hidden="true" className="size-3 fill-current" /> Flagship
              </span>
            )}
            {s.hasCaseStudy && (
              <span className="border-ink/10 text-slate inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]">
                <BookOpenText aria-hidden="true" className="size-3" /> Case study
              </span>
            )}
          </span>
        </span>

        <span className="text-ink mt-5 flex items-center gap-1.5 text-lg font-semibold tracking-tight">
          <span className="min-w-0 truncate">{s.name}</span>
          <ArrowUpRight
            aria-hidden="true"
            className="text-slate group-hover/c:text-accent size-4 shrink-0 transition-all group-hover/c:translate-x-0.5 group-hover/c:-translate-y-0.5"
          />
        </span>
        {s.description && (
          <span className="text-slate mt-1.5 line-clamp-2 text-sm leading-relaxed">
            {s.description}
          </span>
        )}

        {(() => {
          const facts = [
            showHome && s.home ? <span key="home">{s.home}</span> : null,
            s.domain ? <span key="domain">{s.domain}</span> : null,
            s.repoPrivate ? (
              <span key="private" className="inline-flex items-center gap-1">
                <Lock aria-hidden="true" className="size-3" /> Private repo
              </span>
            ) : null,
          ].filter(Boolean);
          return facts.length > 0 ? (
            <span className="text-slate/80 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] [&>*+*]:before:mr-2 [&>*+*]:before:content-['·']">
              {facts}
            </span>
          ) : null;
        })()}

        {s.tech.length > 0 && (
          <span className="mt-4 flex flex-wrap gap-1.5">
            {s.tech.slice(0, 4).map((t) => (
              <TechChip key={t} name={t} />
            ))}
            {/* The card shows four; the rest are counted, never silently dropped (all on the case study). */}
            {s.tech.length > 4 && (
              <span title={s.tech.slice(4).join(", ")} className="text-slate border-ink/10 inline-flex h-7 items-center rounded-full border px-2 font-mono text-[11px]">
                +{s.tech.length - 4}
              </span>
            )}
          </span>
        )}

        {(moving || activityText(s)) && (
          <span className="border-ink/10 mt-auto flex items-center gap-3 border-t pt-4 [&:not(:first-child)]:mt-5">
            {moving ? (
              <>
                <Sparkline values={s.weeks} className="w-24" />
                <span className="text-slate flex items-center gap-1.5 text-[11px]">
                  {s.commitsLast4Weeks > 0 && (
                    // The card's one live indicator (PAGE-BUILD-PLAYBOOK §5): commits in the last four weeks.
                    <span aria-hidden="true" className="relative flex size-1.5">
                      <span className="bg-ember absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" />
                      <span className="bg-ember relative inline-flex size-1.5 rounded-full" />
                    </span>
                  )}
                  {activityText(s)}
                </span>
              </>
            ) : (
              <span className="text-slate text-[11px]">{activityText(s)}</span>
            )}
          </span>
        )}
      </Link>
    </MagicCard>
  );
}
