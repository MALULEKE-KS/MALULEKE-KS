// components/systems/CatalogCard.tsx
// One system in the /systems catalog (PAGE-BUILD-PLAYBOOK §9): status, name,
// what it is, where it lives, what it's built with, and whether it's moving —
// on a Magic Card that lights up under the pointer. A private repo shows a
// lock (BR-1.7); a written case study gets a badge; the whole card links to
// the system's page. Data: lib/queries/catalog.ts.

import Link from "next/link";
import { ArrowUpRight, BookOpenText, Lock, Star } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Sparkline } from "@/components/shared/Sparkline";
import { TechChip } from "@/components/shared/TechChip";
import type { CatalogSystem } from "@/lib/queries/catalog";

export function CatalogCard({ s }: { s: CatalogSystem }) {
  const moving = s.weeks.some((n) => n > 0);
  return (
    <MagicCard className="h-full rounded-3xl shadow-soft" surface="var(--color-sheet)" spotlight="rgb(255 91 31 / 0.05)">
      <Link href={`/systems/${s.slug}`} className="group/c flex h-full flex-col p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember md:p-6">
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
          <ArrowUpRight aria-hidden="true" className="text-slate group-hover/c:text-accent size-4 shrink-0 transition-all group-hover/c:translate-x-0.5 group-hover/c:-translate-y-0.5" />
        </span>
        <span className="text-slate mt-1.5 line-clamp-2 text-sm leading-relaxed">{s.description}</span>

        <span className="text-slate/80 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px]">
          {s.home && <span>{s.home}</span>}
          {s.domain && <span>· {s.domain}</span>}
          {s.repoPrivate && (
            <span className="inline-flex items-center gap-1">
              · <Lock aria-hidden="true" className="size-3" /> Private repo
            </span>
          )}
        </span>

        {s.tech.length > 0 && (
          <span className="mt-4 flex flex-wrap gap-1.5">
            {s.tech.slice(0, 4).map((t) => (
              <TechChip key={t} name={t} />
            ))}
          </span>
        )}

        <span className="border-ink/10 mt-auto flex items-center gap-3 border-t pt-4 [&:not(:first-child)]:mt-5">
          {moving ? (
            <>
              <Sparkline values={s.weeks} className="w-24" />
              <span className="text-slate text-[11px]">
                {s.commitsLast4Weeks > 0 ? `${s.commitsLast4Weeks} commits in 4 weeks` : "Quiet this month"}
                {s.lastPush && ` · ${s.lastPush}`}
              </span>
            </>
          ) : (
            <span className="text-slate text-[11px]">{s.lastPush ? `Last push ${s.lastPush}` : "No recent activity"}</span>
          )}
        </span>
      </Link>
    </MagicCard>
  );
}
