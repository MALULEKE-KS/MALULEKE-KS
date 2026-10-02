// components/about/GuideInvite.tsx
// About — the AI guide, smaller, beside the real portrait (owner, 2026-10-02:
// "both"). The guide's poses cross-fade — wave, point, thinking — every few
// seconds, inviting a question about him; a question asks it straight away.
// Only the first pose loads with the page; the others follow once it's idle,
// so a phone pays for one picture until the card has time to move.
// Always labelled as AI (BR-4.3). Reduced motion: one pose, still. Hidden
// when the guide is switched off.

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useGuide } from "@/components/guide/GuideProvider";
import { cn } from "@/lib/utils";

const POSES = ["/character/guide-wave.webp", "/character/guide-point.webp", "/character/guide-thinking.webp"];

export function GuideInvite({ questions }: { questions: string[] }) {
  const { enabled, ownerFirstName, ask } = useGuide();
  const reduced = useReducedMotion();
  const [pose, setPose] = useState(0);
  const [mounted, setMounted] = useState(1);
  useEffect(() => {
    if (reduced) return;
    const later = setTimeout(() => setMounted(POSES.length), 3000);
    const t = setInterval(() => setPose((p) => (p + 1) % POSES.length), 5000);
    return () => (clearTimeout(later), clearInterval(t));
  }, [reduced]);
  if (!enabled) return null;

  return (
    <div className="bg-night-deep text-paper shadow-lift relative overflow-hidden rounded-3xl border border-white/10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(28rem_18rem_at_20%_100%,rgb(255_91_31/0.18),transparent_70%)]" />
      <div className="relative grid items-end gap-0 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <div aria-hidden="true" className="relative mx-auto h-52 w-44 sm:h-60 sm:w-full">
          {POSES.slice(0, mounted).map((src, i) => (
            <Image
              key={src}
              src={src}
              alt=""
              fill
              sizes="11rem"
              className={cn("object-contain object-bottom transition-opacity duration-1000 motion-reduce:transition-none", i === pose ? "opacity-100" : "opacity-0")}
            />
          ))}
        </div>
        <div className="p-6 sm:py-7 sm:pr-7 sm:pl-2">
          <p className="text-mist flex items-center gap-2 text-xs">
            <span className="border-ember/30 bg-ember/10 text-ember rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide uppercase">AI</span>
            {ownerFirstName}&rsquo;s guide
          </p>
          <p className="mt-2 font-sans text-xl font-semibold tracking-tight">Curious about something? Ask me about him.</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {questions.slice(0, 3).map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => ask(q)}
                  className="group/q hover:border-ember/40 text-mist hover:text-paper inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
                >
                  <Sparkles aria-hidden="true" className="text-ember size-3.5 shrink-0" />
                  <span className="truncate">{q}</span>
                  <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
