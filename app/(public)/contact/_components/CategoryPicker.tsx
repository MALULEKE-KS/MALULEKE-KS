// app/(public)/contact/_components/CategoryPicker.tsx
// Let's Talk, step one — "What brings you here?" Large tiles from the
// inquiry types (EXT-1: a new type is a lookup row, and gets the general
// form). Each tile carries its icon, its description, and what the form will
// ask, so a visitor knows the cost before they choose. A spotlight follows the
// pointer (Magic UI's MagicCard, converted to the tokens).

"use client";

import { ArrowRight, Briefcase, Code2, Handshake, MessageCircle, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { CATEGORY_FIELDS, FORM_SHAPE } from "@/lib/inquiries/fields";
import type { CategoryKey } from "@/lib/inquiries/forms";
import type { InquiryTypeOption } from "@/lib/queries/site";
import { cn } from "@/lib/utils";

export const CATEGORY_ICON: Record<CategoryKey, LucideIcon> = { recruitment: Briefcase, service: Code2, collaboration: Handshake, growth: TrendingUp, general: MessageCircle };

/** "About 2 minutes · 5 questions" — counted from the form itself, never typed. */
function costOf(form: CategoryKey) {
  const shape = FORM_SHAPE[form];
  const questions = CATEGORY_FIELDS[form].filter((f) => !f.optional && !f.when).length + 1 + (shape.compensation ? 1 : 0) + (shape.meeting ? 1 : 0) + 2;
  return `${questions} questions · about ${Math.max(1, Math.round(questions / 3))} min`;
}

export function CategoryPicker({ categories, fromGuide, onChoose, title, description }: { categories: InquiryTypeOption[]; fromGuide: boolean; onChoose: (key: string) => void; title: string; description: string | null }) {
  return (
    <div>
      {fromGuide && (
        <p role="status" className="border-ember/30 bg-ember/10 mb-6 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm">
          <Sparkles aria-hidden="true" className="text-accent mt-0.5 size-4 shrink-0" />
          The AI guide drafted your message — choose what it&rsquo;s about, then read it and add your details. Nothing is sent until you press send.
        </p>
      )}
      <h2 className="text-ink font-sans text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
      {description && <p className="text-slate mt-2">{description}</p>}
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {categories.map((c, i) => {
          const form = c.form ?? "general";
          const Icon = CATEGORY_ICON[form];
          return (
            <li key={c.value} className={cn(i === categories.length - 1 && categories.length % 2 === 1 && "sm:col-span-2")}>
              <MagicCard className="h-full rounded-2xl" surface="var(--color-paper)" rest="rgb(11 12 14 / 0.1)" spotlight="rgb(255 91 31 / 0.08)" gradientSize={240}>
                <button
                  type="button"
                  onClick={() => onChoose(c.value)}
                  className="group/tile focus-visible:outline-ember flex h-full w-full items-start gap-4 rounded-2xl p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="bg-ink text-paper group-hover/tile:bg-ember group-hover/tile:text-ink grid size-11 shrink-0 place-items-center rounded-xl transition-colors">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block font-sans text-base font-semibold">{c.label}</span>
                    {c.description && <span className="text-slate mt-1 block text-sm leading-snug">{c.description}</span>}
                    <span className="text-slate/80 mt-3 block font-mono text-[11px]">{costOf(form)}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className="text-slate group-hover/tile:text-ink mt-1 size-4 shrink-0 transition-transform group-hover/tile:translate-x-0.5" />
                </button>
              </MagicCard>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
