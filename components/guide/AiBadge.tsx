// components/guide/AiBadge.tsx
// The one mark the site uses wherever something is AI (BR-4.3: the guide is
// always labelled as AI; the written case studies too) — one component, so the
// label can't drift between the home band, the guide's header and About's
// invitation (D-055, the integration sweep).

import { cn } from "@/lib/utils";

export function AiBadge({ className, tone = "dark" }: { className?: string; /** "light" on a bone surface: the ember is too light to read there (D-062). */ tone?: "dark" | "light" }) {
  return (
    <span
      className={cn(
        "bg-ember/10 inline-flex items-center rounded-full border px-1.5 py-px font-mono text-[10px] font-medium tracking-wide uppercase",
        tone === "light" ? "border-accent/30 text-accent-strong" : "border-ember/30 text-ember",
        className,
      )}
    >
      AI
    </span>
  );
}
