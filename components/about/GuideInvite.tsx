// components/about/GuideInvite.tsx
// About — the AI guide's invitation beside the portrait (owner, 2026-10-02: "both").
// The guide is shown by the site's own K-S mark, as everywhere else (D-044; the
// illustrated poses that cross-faded here were retired with it), and three
// questions about the owner, each asked straight away. Always labelled as AI
// (BR-4.3). Hidden when the guide is switched off.

"use client";

import { ArrowRight } from "lucide-react";
import { CubeMark } from "@/components/shared/BrandMark";
import { useGuide } from "@/components/guide/GuideProvider";

export function GuideInvite({ questions }: { questions: string[] }) {
  const { enabled, ownerFirstName, ask } = useGuide();
  if (!enabled) return null;
  const list = questions.slice(0, 3);

  return (
    <div className="bg-night-deep text-paper overflow-hidden rounded-[1.25rem] border border-white/[0.09] shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_30px_80px_-40px_rgb(0_0_0/0.9)]">
      <div className="flex items-start gap-3.5 px-5 pt-5 pb-4 sm:px-6">
        <CubeMark spin={false} className="size-11 ring-1 ring-white/12" />
        <div className="min-w-0">
          <p className="text-mist flex items-center gap-2 text-xs">
            <span className="border-ember/30 bg-ember/10 text-ember rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide uppercase">AI</span>
            {ownerFirstName}&rsquo;s guide
          </p>
          <p className="mt-1.5 font-sans text-lg leading-snug font-semibold tracking-tight">Curious about something? Ask me about him.</p>
        </div>
      </div>
      {list.length > 0 && (
        <ul className="divide-y divide-white/[0.06] border-t border-white/[0.07]">
          {list.map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => ask(q)}
                className="group/q focus-visible:outline-ember flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 sm:px-6"
              >
                <span className="text-paper min-w-0 flex-1 text-sm leading-snug">{q}</span>
                <ArrowRight
                  aria-hidden="true"
                  className="text-line group-hover/q:text-ember mt-0.5 size-4 shrink-0 transition-[transform,color] duration-200 group-hover/q:translate-x-0.5 motion-reduce:transition-none"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
