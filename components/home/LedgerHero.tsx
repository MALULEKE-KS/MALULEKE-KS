// components/home/LedgerHero.tsx
// The signature moment (Design System §7). Lines blend Kurhula's own career
// journey with the system's own journey, at aggregate-fact level only — never
// a named list of individual systems, which is the systems grid directly
// below this component, /systems, and /journey's job. All numbers are real,
// server-computed data passed in as props — never hardcoded copy.

"use client";

import { useTypewriterLines } from "@/hooks/useTypewriterLines";
import { ScaleFigure } from "@/components/home/ScaleFigure";

interface LedgerHeroProps {
  yearsBuilding: number;
  organizationsFounded: number;
  systemsShipped: number;
  systemsQueued: number;
}

export function LedgerHero({
  yearsBuilding,
  organizationsFounded,
  systemsShipped,
  systemsQueued,
}: LedgerHeroProps) {
  const lines = [
    `${yearsBuilding} year${yearsBuilding === 1 ? "" : "s"} building. ${organizationsFounded} organization${organizationsFounded === 1 ? "" : "s"} founded.`,
    `${systemsShipped} system${systemsShipped === 1 ? "" : "s"} shipped. ${systemsQueued > 0 ? `${systemsQueued} more queued.` : "None queued."}`,
    // Closing half of the locked mission statement (Overview §10) reused
    // verbatim — not new copy invented for this moment.
    `Engineered in South Africa, held to a global standard.`,
  ];

  const { revealedLines, currentLineText, done, totalDurationMs } = useTypewriterLines(lines);

  return (
    <section className="ledger-hero bg-paper px-6 py-24 md:py-32">
      <div className="max-w-prose flex items-start gap-8">
        <div className="flex-1">
          <p className="font-mono text-sm text-slate mb-4">MALULEKE-KS — SYSTEM LOG</p>

          <div className="font-sans text-2xl md:text-4xl text-ink leading-snug space-y-1">
            {revealedLines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}

            {!done && currentLineText !== undefined && currentLineText !== "" && (
              <p>
                {currentLineText}
                <span className="ledger-caret" aria-hidden="true" />
              </p>
            )}

            {!done && currentLineText === "" && revealedLines.length < lines.length && (
              <p>
                <span className="ledger-caret" aria-hidden="true" />
              </p>
            )}
          </div>

          {/* Screen readers get the full content immediately — the typewriter
              effect is decorative, never load-bearing for comprehension. */}
          <p className="sr-only">{lines.join(" ")}</p>
        </div>

        {/* Decorative reinforcement of the text, not content in its own
            right — aria-hidden, and ScaleFigure itself handles the
            prefers-reduced-motion fallback (fully drawn, no animation). */}
        <ScaleFigure durationMs={totalDurationMs} className="hidden md:block w-16 shrink-0" />
      </div>
    </section>
  );
}
