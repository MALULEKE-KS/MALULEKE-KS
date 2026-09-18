// components/shared/SectionHeader.tsx
// Section header (DESIGN-SYSTEM.md v3 §6): a pill micro-badge with an icon
// sets the context, then the title, an optional one-line description and an
// optional right-aligned link. Sentence case — no all-caps eyebrows.

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  icon: LucideIcon;
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  action?: { href: string; label: string };
  tone?: "light" | "dark";
  id?: string;
  /** Let the title run wider (e.g. a quote) instead of the default max-w-2xl. */
  wide?: boolean;
  className?: string;
}

export function SectionHeader({ icon: Icon, eyebrow, title, description, action, tone = "light", id, wide = false, className }: SectionHeaderProps) {
  const dark = tone === "dark";
  return (
    <div className={cn("mb-12 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between", className)}>
      <div className={wide ? "max-w-4xl" : "max-w-2xl"}>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
            dark ? "border-white/10 bg-white/5 text-mist" : "border-ink/10 bg-sheet text-slate shadow-soft",
          )}
        >
          <Icon aria-hidden="true" className={cn("size-3.5", dark ? "text-ember" : "text-accent")} />
          {eyebrow}
        </span>
        <h2
          id={id}
          className={cn(
            "mt-5 font-sans text-3xl font-semibold leading-[1.1] tracking-tight md:text-5xl",
            dark ? "text-paper" : "text-ink",
          )}
        >
          {title}
        </h2>
        {description && (
          <p className={cn("mt-4 text-lg leading-relaxed", dark ? "text-mist" : "text-slate")}>{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className={cn(
            "group inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
            dark
              ? "border-white/15 text-paper hover:border-white/30 hover:bg-white/5"
              : "border-ink/15 bg-sheet text-ink shadow-soft hover:border-ink/30",
          )}
        >
          {action.label}
          <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
