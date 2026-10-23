// components/shared/SectionHeader.tsx
// Section header (DESIGN-SYSTEM.md v3 §6), in the shape every page now shares
// (D-046, D-047): the plain label (an ember hairline and the words — no pill,
// no icon), the title with the owner's accent word, an optional one-line
// description and an optional link set at the right on wide screens.
// With a copyKey, the eyebrow, title and description come from the
// "page-copy" content block (lib/content/copy.ts); the props are the fallback.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Accent } from "@/components/shared/Accent";
import { HeroLabel } from "@/components/shared/HeroKit";
import { sectionCopy } from "@/lib/content/copy";

interface SectionHeaderProps {
  /** The section's key in the page-copy block, e.g. "home.map". */
  copyKey?: string;
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

export async function SectionHeader({ copyKey, eyebrow: eyebrowProp, title: titleProp, description: descriptionProp, action, tone = "light", id, wide = false, className }: SectionHeaderProps) {
  const dark = tone === "dark";
  const copy = copyKey ? await sectionCopy(copyKey, {}) : {};
  const eyebrow = copy.eyebrow ?? eyebrowProp;
  const title = copy.title ? <Accent text={copy.title} className="type-accent text-ember-gradient pr-[0.06em]" /> : titleProp;
  const description = copy.description ?? descriptionProp;
  return (
    <div className={cn("mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between", className)}>
      <div className={wide ? "max-w-4xl" : "max-w-2xl"}>
        <HeroLabel tone={dark ? "dark" : "light"}>{eyebrow}</HeroLabel>
        <h2 id={id} className={cn("type-h2 mt-5 text-balance", dark ? "text-paper" : "text-ink")}>
          {title}
        </h2>
        {description && <p className={cn("type-lede mt-4 max-w-[60ch]", dark ? "text-mist" : "text-slate")}>{description}</p>}
      </div>
      {action && <SectionLink href={action.href} label={action.label} tone={tone} />}
    </div>
  );
}

/** The section's one link onward ("All systems", "The full method"): words and an arrow over a hairline — no capsule. */
export function SectionLink({ href, label, tone = "light", className }: { href: string; label: string; tone?: "light" | "dark"; className?: string }) {
  const dark = tone === "dark";
  return (
    <Link
      href={href}
      className={cn(
        "group/sl tap-target press focus-visible:outline-ember inline-flex shrink-0 items-center gap-2 self-start border-b pb-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 md:self-auto",
        dark ? "text-paper hover:border-ember border-white/25" : "text-ink hover:border-ember border-ink/20",
        className,
      )}
    >
      {label}
      <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover/sl:translate-x-1 motion-reduce:transition-none" />
    </Link>
  );
}
