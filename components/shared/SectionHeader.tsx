// components/shared/SectionHeader.tsx
// Section header (DESIGN-SYSTEM.md v2 §6): a mono sheet-section index
// ("01.2") on a drafting rule, the section title, optional right-aligned link.

import Link from "next/link";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  index: string;
  eyebrow: string;
  title: React.ReactNode;
  action?: { href: string; label: string };
  tone?: "light" | "dark";
  id?: string;
}

export function SectionHeader({ index, eyebrow, title, action, tone = "light", id }: SectionHeaderProps) {
  const dark = tone === "dark";
  return (
    <div className="mb-12 md:mb-16">
      <div className={cn("flex items-center gap-4 font-mono text-xs", dark ? "text-line" : "text-slate")}>
        <span className={dark ? "text-amber" : "text-accent"}>{index}</span>
        <span>{eyebrow}</span>
        <span aria-hidden="true" className={cn("h-px flex-1", dark ? "bg-line/25" : "bg-ink/15")} />
      </div>
      <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h2
          id={id}
          className={cn(
            "max-w-3xl font-sans text-3xl leading-tight font-semibold tracking-tight md:text-4xl",
            dark ? "text-paper" : "text-ink"
          )}
        >
          {title}
        </h2>
        {action && (
          <Link
            href={action.href}
            className={cn(
              "group inline-flex shrink-0 items-center gap-2 font-sans text-sm underline underline-offset-4",
              dark
                ? "text-paper decoration-line/50 hover:text-amber hover:decoration-amber"
                : "text-ink decoration-ink/30 hover:decoration-ink"
            )}
          >
            {action.label}
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
