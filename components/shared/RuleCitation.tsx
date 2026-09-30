// components/shared/RuleCitation.tsx
// A business-rule reference ("BR-1.1") as a mono pill that links to the rule
// itself — the platform's rules are public, in docs/BUSINESS-RULES-v1.md in
// the public repository — so a visitor can check the claim, not take it on
// trust (DESIGN-SYSTEM.md §2: mono for real identifiers; #99).

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const RULES_URL = "https://github.com/MALULEKE-KS/MALULEKE-KS/blob/main/docs/BUSINESS-RULES-v1.md";

interface RuleCitationProps {
  rule: string; // e.g. "BR-1.1"
  tone?: "light" | "dark";
  className?: string;
}

export function RuleCitation({ rule, tone = "light", className }: RuleCitationProps) {
  return (
    <a
      href={RULES_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={`Read ${rule} in the business rules`}
      className={cn(
        "focus-visible:outline-ember inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        tone === "dark"
          ? "border-ember/40 bg-ember/10 text-ember hover:bg-ember/20"
          : "border-accent/30 bg-accent/5 text-accent hover:bg-accent/10",
        className
      )}
    >
      {rule}
      <ExternalLink aria-hidden="true" className="size-3" />
    </a>
  );
}
