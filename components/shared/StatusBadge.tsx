// components/shared/StatusBadge.tsx
// The colour IS the status (Design System §1) — one component everywhere, so
// Status → colour can never drift between the hero map, cards, the case study
// and the admin table.
//
// Data-driven, not a switch on status key (EXT-1): `colorToken` comes from the
// Status row (Status.colorToken, prisma/seed.ts) and names a WCAG-checked CSS
// custom property in globals.css. `onDark` uses the same token's re-measured
// dark-surface value (`--color-<token>-on-dark`), falling back to the light one.

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
      className="relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{ color: colorVar, borderColor: `color-mix(in srgb, ${colorVar} 35%, transparent)` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-10"
        style={{ backgroundColor: colorVar }}
      />
      <span aria-hidden="true" className="relative size-1.5 rounded-full" style={{ backgroundColor: colorVar }} />
      <span className="relative">{label}</span>
    </span>
  );
}
