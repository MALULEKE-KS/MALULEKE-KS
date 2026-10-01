// components/admin/ui.tsx
// The admin's building blocks on Design System v3 (#104): page header, panel
// cards, stat tiles, empty states, and the shared control classes, so every
// admin screen looks and behaves the same. Bone content, soft depth, pill
// buttons, ember only for the primary action and focus.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const adminInput =
  "w-full rounded-xl border border-ink/15 bg-paper px-3.5 py-2.5 font-sans text-sm text-ink shadow-inset-hair outline-none transition-[border-color,box-shadow] placeholder:text-slate/60 focus:border-ember focus:ring-4 focus:ring-ember/15 disabled:opacity-60";
export const adminLabel = "mb-1.5 block text-sm font-medium text-ink";
export const adminHint = "mt-1 text-xs text-slate";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-[background-color,border-color,box-shadow,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4";
export const adminButton = {
  primary: cn(BUTTON_BASE, "bg-ember text-ink shadow-glow-ember hover:brightness-105"),
  dark: cn(BUTTON_BASE, "bg-ink text-paper hover:bg-ink/85"),
  secondary: cn(BUTTON_BASE, "border border-ink/15 bg-sheet text-ink shadow-soft hover:border-ink/30"),
  ghost: cn(BUTTON_BASE, "text-slate hover:bg-ink/5 hover:text-ink"),
  danger: cn(BUTTON_BASE, "border border-critical/30 bg-critical/5 text-critical hover:bg-critical/10"),
};

export function AdminPageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <span className="grid size-10 place-items-center rounded-xl bg-ink text-paper">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <h1 className="mt-4 font-sans text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  id,
}: {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 rounded-2xl border border-ink/10 bg-sheet shadow-soft", className)}>
      {(title || actions) && (
        <div className="flex flex-col gap-2 border-b border-ink/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h2 className="font-sans text-base font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, href, tone = "neutral" }: { label: string; value: React.ReactNode; href?: string; tone?: "neutral" | "attention" | "good" }) {
  const body = (
    <>
      <p className="text-xs font-medium text-slate">{label}</p>
      <p
        className={cn(
          "mt-2 font-sans text-3xl font-semibold tracking-tight",
          tone === "attention" ? "text-accent" : tone === "good" ? "text-signal-finished" : "text-ink",
        )}
      >
        {value}
      </p>
    </>
  );
  const cls = "block rounded-2xl border border-ink/10 bg-sheet p-5 shadow-soft";
  return href ? (
    <Link href={href} className={cn(cls, "transition-[border-color,box-shadow] hover:border-ink/20 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function EmptyState({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-ink/15 bg-paper px-6 py-10 text-center">
      <Icon aria-hidden="true" className="size-6 text-slate" />
      <p className="mt-3 text-sm text-slate">{children}</p>
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "attention" | "good" | "critical" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "attention" && "bg-ember/10 text-accent",
        tone === "good" && "bg-signal-finished/10 text-signal-finished",
        tone === "critical" && "bg-critical/10 text-critical",
        tone === "neutral" && "bg-ink/[0.06] text-slate",
      )}
    >
      {children}
    </span>
  );
}

export function formatWhen(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
