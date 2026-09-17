// components/shared/SystemCard.tsx
// The corner-bracket hover/focus state (Design System §7) — a discrete
// two-state interaction, which is exactly what Tailwind utilities are best
// at. No custom CSS in this file at all.

import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface SystemCardProps {
  slug: string;
  name: string;
  description: string;
  // Status is an EXT-1 lookup table (Status model, schema.prisma), not a
  // fixed set of code-level literals — a hardcoded union here would break
  // the moment an admin adds a new Status value without a redeploy. The
  // label/colorToken pair comes straight off the queried Status row.
  status: { label: string; colorToken: string };
  isFlagship?: boolean;
}

const CORNER_BASE =
  "absolute w-3.5 h-3.5 border-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100";

export function SystemCard({ slug, name, description, status, isFlagship }: SystemCardProps) {
  return (
    <Link
      href={`/systems/${slug}`}
      className="group relative block border border-slate/25 bg-white px-6 py-5 outline-none transition-colors hover:border-slate/40"
    >
      {/* Four corner brackets — the CAD/drafting selection indicator,
          replacing the rounded-card-plus-shadow treatment this design
          system deliberately ruled out (Design System §0). */}
      <span className={`${CORNER_BASE} top-0 left-0 border-t-2 border-l-2`} />
      <span className={`${CORNER_BASE} top-0 right-0 border-t-2 border-r-2`} />
      <span className={`${CORNER_BASE} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${CORNER_BASE} bottom-0 right-0 border-b-2 border-r-2`} />

      <div className="flex items-start justify-between gap-4">
        <h3 className="font-sans font-semibold text-lg text-ink">{name}</h3>
        <StatusBadge label={status.label} colorToken={status.colorToken} />
      </div>

      {isFlagship && (
        // A filled square glyph, not color alone, marks flagship — brass
        // is also signal-progress's color (Design System §1: "progress ==
        // accent" is a deliberate reuse), so a flagship system that's also
        // in_progress needs a cue beyond "this text is brass" to read as
        // two distinct facts rather than one repeated one.
        <p className="font-mono text-xs text-accent mt-1 flex items-center gap-1">
          <span aria-hidden="true">■</span> Flagship
        </p>
      )}

      <p className="font-serif text-sm text-slate mt-3 max-w-prose">{description}</p>
    </Link>
  );
}
