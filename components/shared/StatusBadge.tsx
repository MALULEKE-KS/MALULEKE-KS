// components/shared/StatusBadge.tsx
// The color IS the status (Design System §1) — one component, every list,
// so the mapping from Status to color can never drift between the hero
// drawing, the systems grid, the case study header and the admin table.
//
// Data-driven, not a hardcoded switch on status key (EXT-1): `colorToken`
// comes from the Status row (Status.colorToken, seeded in prisma/seed.ts)
// and names a pre-approved, WCAG-checked CSS custom property in globals.css.
// `onDark` picks the same token's re-measured value for blueprint surfaces
// (`--color-<token>-on-dark`), falling back to the light value if a new
// token hasn't been given a dark variant yet.

interface StatusBadgeProps {
  label: string;
  colorToken: string; // e.g. "signal-finished"
  onDark?: boolean;
}

export function StatusBadge({ label, colorToken, onDark = false }: StatusBadgeProps) {
  const colorVar = onDark
    ? `var(--color-${colorToken}-on-dark, var(--color-${colorToken}))`
    : `var(--color-${colorToken})`;

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 font-mono text-xs"
      style={{ color: colorVar, borderColor: colorVar }}
    >
      <span aria-hidden="true" className="size-1.5" style={{ backgroundColor: colorVar }} />
      {label}
    </span>
  );
}
