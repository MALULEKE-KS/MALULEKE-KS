// components/home/LedgerHero.tsx
// The signature moment (DESIGN-SYSTEM.md v2 §5 `ledger`, §7.1): live facts
// logging themselves, with every number set in amber — "the numbers moment".
// All numbers are server-computed props, never hardcoded copy; the lines
// stay at aggregate level (named systems are the drawing's and /systems' job).
//
// No layout shift while typing: each line renders its full text invisibly
// in the same grid cell as the typed text, so the block is its final size
// from the first frame and the buttons below never jump.

"use client";

import { useTypewriterLines } from "@/hooks/useTypewriterLines";

interface LedgerHeroProps {
  yearsBuilding: number;
  organizationsFounded: number;
  systemsShipped: number;
  systemsQueued: number;
}

// Numbers in amber — the accent spent on "the numbers" (§4.2).
function withNumbers(text: string) {
  return text.split(/(\d+)/).map((part, i) =>
    /^\d+$/.test(part) ? (
      <span key={i} className="text-amber">
        {part}
      </span>
    ) : (
      part
    )
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function LedgerHero({ yearsBuilding, organizationsFounded, systemsShipped, systemsQueued }: LedgerHeroProps) {
  // One entry per line, each opening on its number — a log, not a sentence.
  const lines = [
    `${plural(yearsBuilding, "year")} building.`,
    `${plural(organizationsFounded, "organization")} founded.`,
    `${plural(systemsShipped, "system")} shipped.`,
    systemsQueued > 0 ? `${systemsQueued} more queued.` : "None queued yet.",
    // Closing half of the locked mission statement (Overview §10), verbatim.
    `Engineered in South Africa, held to a global standard.`,
  ];

  const { revealedLines, currentLineText, done } = useTypewriterLines(lines, { msPerChar: 34, pauseBetweenLines: 260 });
  const activeIndex = revealedLines.length;

  return (
    <div className="ledger-hero">
      {/* Screen readers get the full content at once; the typing is visual. */}
      <p className="sr-only">{lines.join(" ")}</p>

      <div aria-hidden="true">
        {lines.map((line, i) => {
          const typed = i < activeIndex ? line : i === activeIndex ? currentLineText : "";
          const showCaret = !done && i === activeIndex;
          const isMission = i === lines.length - 1;
          return (
            <p
              key={i}
              className={
                isMission
                  ? "text-mist mt-6 font-serif text-xl leading-snug italic md:text-2xl"
                  : "text-paper font-sans text-4xl leading-[1.1] font-medium tracking-tight md:text-5xl"
              }
            >
              <span className="grid">
                <span className="invisible col-start-1 row-start-1">{line}</span>
                <span className="col-start-1 row-start-1">
                  {withNumbers(typed)}
                  {showCaret && <span className="ledger-caret" />}
                </span>
              </span>
            </p>
          );
        })}
      </div>
    </div>
  );
}
