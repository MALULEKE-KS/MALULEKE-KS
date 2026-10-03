// components/about/skill-icons.tsx
// A skill's brand mark, by the skill's name (data), from the site's one map of
// marks (components/shared/TechChip.tsx — brandMark). A skill without a mark
// gets a clean monogram, so a new skill never needs code.

import { brandMark } from "@/components/shared/TechChip";
import { cn } from "@/lib/utils";

/** The skill's mark, or its initials when it has none. */
export function SkillIcon({ name, className }: { name: string; className?: string }) {
  const mark = brandMark(name, cn("size-5", className));
  if (mark) return mark;
  const initials = name
    .replace(/[^A-Za-z0-9+ ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span aria-hidden="true" className={cn("font-mono text-[11px] font-semibold", className)}>
      {initials || "•"}
    </span>
  );
}
