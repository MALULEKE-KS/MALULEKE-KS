// components/shared/SystemCard.tsx
// A system in the catalog and in "More systems" (DESIGN-SYSTEM.md v3 §3/§6,
// #99), following the card anatomy: meta + badge header → title → muted
// description → specs (stack) → one action. The whole card is one link; the
// status colour is the Status row's own token (EXT-1), never a switch in code.

import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { Spotlight } from "@/components/shared/Spotlight";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface SystemCardProps {
  slug: string;
  name: string;
  description: string;
  status: { label: string; colorToken: string };
  isFlagship?: boolean;
  organization?: string | null;
  domain?: string | null;
  techStack?: string[];
}

const STACK_SHOWN = 4;

export function SystemCard({
  slug,
  name,
  description,
  status,
  isFlagship,
  organization,
  domain,
  techStack = [],
}: SystemCardProps) {
  const meta = [organization, domain].filter(Boolean).join(" / ");
  const extra = techStack.length - STACK_SHOWN;

  return (
    <Spotlight className="h-full rounded-2xl">
      <Link
        href={`/systems/${slug}`}
        className="group border-ink/10 bg-sheet shadow-soft hover:border-ink/20 hover:shadow-lift focus-visible:outline-ember flex h-full flex-col rounded-2xl border p-6 transition-[box-shadow,transform,border-color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:hover:-translate-y-0.5"
      >
        <div className="flex flex-wrap items-center gap-2">
          {isFlagship && (
            <span className="bg-ember/10 text-accent inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
              <Star aria-hidden="true" className="size-3 fill-current" />
              Flagship
            </span>
          )}
          <StatusBadge label={status.label} colorToken={status.colorToken} />
        </div>

        {meta && <p className="text-slate mt-5 font-mono text-xs">{meta}</p>}
        <h3 className="text-ink mt-1.5 font-sans text-xl font-semibold tracking-tight">{name}</h3>
        <p className="text-slate mt-2 line-clamp-3 font-serif leading-relaxed">{description}</p>

        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          {techStack.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Stack">
              {techStack.slice(0, STACK_SHOWN).map((tech) => (
                <li
                  key={tech}
                  className="border-ink/10 bg-paper text-slate rounded-full border px-2.5 py-0.5 font-mono text-xs"
                >
                  {tech}
                </li>
              ))}
              {extra > 0 && <li className="text-slate px-1 font-mono text-xs">+{extra}</li>}
            </ul>
          ) : (
            <span />
          )}
          <span
            aria-hidden="true"
            className="border-ink/10 text-slate group-hover:border-ink group-hover:bg-ink group-hover:text-paper grid size-9 shrink-0 place-items-center rounded-full border transition-colors"
          >
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </Link>
    </Spotlight>
  );
}
