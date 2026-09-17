// components/shared/StatusBadge.tsx
// The color IS the status (Design System §1) — one component, every list,
// so the mapping from Status to color can never drift between the systems
// grid, the case study header, and the admin table.
//
// Deliberately data-driven, not a hardcoded switch on status key (EXT-1):
// `colorToken` comes from the Status row itself (Status.colorToken in
// schema.prisma, seeded in prisma/seed.ts) and names one of the pre-approved,
// WCAG-checked CSS custom properties defined in globals.css/tailwind.config.ts
// (e.g. "signal-finished", "slate", "accent"). Adding a new admin-facing
// Status value — even one this component has never seen — only ever means a
// new row picking an existing token from that fixed, curated palette. No
// component code change, no redeploy, and no risk of an unvetted color
// breaking the "one accent, spent deliberately" restraint the design system
// is built on (Design System §0/§4).

interface StatusBadgeProps {
  label: string;
  colorToken: string; // e.g. "signal-finished" — must match a token defined in globals.css
}

export function StatusBadge({ label, colorToken }: StatusBadgeProps) {
  const colorVar = `var(--color-${colorToken})`;

  return (
    <span
      className="font-mono text-xs px-2 py-0.5 border shrink-0"
      style={{ color: colorVar, borderColor: colorVar }}
    >
      {label}
    </span>
  );
}
