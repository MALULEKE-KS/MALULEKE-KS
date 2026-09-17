// components/shared/RuleCitation.tsx
// Renders "BR-1.1" style references, mono, linked — makes the platform's own
// discipline tangible on /how-i-build and wherever else a rule is cited.
// TODO: implement — see docs/DESIGN-SYSTEM.md §2 (Mono type, functional identifiers).

interface RuleCitationProps {
  rule: string; // e.g. "BR-1.1"
  href?: string;
}

export function RuleCitation({ rule }: RuleCitationProps) {
  return <span className="rule-citation">{rule}</span>;
}
