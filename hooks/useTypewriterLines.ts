// hooks/useTypewriterLines.ts
// Sequencing lives in code deliberately — real data, timing, and
// prefers-reduced-motion all need to be controlled reliably, which a pure
// CSS keyframe chain can't do cleanly across an arbitrary number of lines.
// See DESIGN-SYSTEM.md §7.

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface UseTypewriterLinesOptions {
  msPerChar?: number;
  pauseBetweenLines?: number;
}

export function useTypewriterLines(
  lines: string[],
  { msPerChar = 28, pauseBetweenLines = 400 }: UseTypewriterLinesOptions = {}
) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [revealedLines, setRevealedLines] = useState<string[]>([]);
  const [currentLineText, setCurrentLineText] = useState("");
  const [done, setDone] = useState(false);

  // Total time the full sequence takes, computed once from the same inputs
  // driving the sequencing itself — exposed so a companion animation (e.g.
  // a line-drawing) can be timed to finish in lockstep without a
  // second, independently-maintained duration constant drifting out of sync.
  const totalDurationMs =
    lines.reduce((sum, line) => sum + line.length * msPerChar, 0) +
    pauseBetweenLines * Math.max(lines.length - 1, 0);

  useEffect(() => {
    // Design System §3 motion principle: motion is never load-bearing for
    // reading the content. When reduced motion is preferred, the full,
    // already-complete result is returned below without ever touching
    // setState from this effect — no animation to run, nothing to do here.
    if (prefersReducedMotion) return;

    let cancelled = false;

    async function run() {
      // for...of avoids indexed access entirely — noUncheckedIndexedAccess
      // (tsconfig.json) would otherwise treat lines[i] as string | undefined.
      for (const line of lines) {
        for (let charIndex = 1; charIndex <= line.length; charIndex++) {
          if (cancelled) return;
          setCurrentLineText(line.slice(0, charIndex));
          await sleep(msPerChar);
        }

        if (cancelled) return;
        setRevealedLines((prev) => [...prev, line]);
        setCurrentLineText("");
        await sleep(pauseBetweenLines);
      }

      if (!cancelled) setDone(true);
    }

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.join("|"), prefersReducedMotion]);

  if (prefersReducedMotion) {
    return { revealedLines: lines, currentLineText: "", done: true, totalDurationMs };
  }

  return { revealedLines, currentLineText, done, totalDurationMs };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
