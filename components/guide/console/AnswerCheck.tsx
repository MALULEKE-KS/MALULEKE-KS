// components/guide/console/AnswerCheck.tsx
// What the answer verifier found (docs/AI-GUIDE-PHASE2-PLAN.md §4 B2): the facts
// in an answer that were looked up in the site's data, and — said plainly — any
// the data does not contain. It never calls an answer false; it says what it could
// not find. The check ran on the server, in code, when the answer finished.

"use client";

import { ShieldCheck, TriangleAlert } from "lucide-react";
import type { Verification } from "@/lib/guide/verify";

export function AnswerCheck({ verification }: { verification: Verification | undefined }) {
  if (!verification || verification.checked === 0) return null;

  if (verification.flagged.length > 0) {
    return (
      <p role="note" className="text-ember flex items-start gap-1.5 text-[11px] leading-snug">
        <TriangleAlert aria-hidden="true" className="mt-px size-3 shrink-0" />
        <span>
          Couldn&apos;t find in the site&apos;s data:{" "}
          {verification.flagged.map((f, i) => (
            <span key={`${f.kind}-${f.text}`}>
              {i > 0 && ", "}
              <strong className="font-semibold">{f.text}</strong>
            </span>
          ))}
          . Treat {verification.flagged.length === 1 ? "it" : "them"} with care — or ask him.
        </span>
      </p>
    );
  }

  return (
    <p className="text-line flex items-center gap-1.5 text-[11px]">
      <ShieldCheck aria-hidden="true" className="size-3 shrink-0" />
      {verification.checked} {verification.checked === 1 ? "fact" : "facts"} checked against the site&apos;s data
    </p>
  );
}
