// components/guide/GuideLauncher.tsx
// The docked AI guide (PUBLIC-REDESIGN-PLAN §3a): the character's face in a
// glass ring, bottom right, on every page except the home page — which has
// the guide's own section, so a floating button there would only duplicate it
// (owner, 2026-09-30). It steps aside while the chat is open, and doesn't
// exist while the guide is switched off. Below lg it gives way to the bottom
// dock, whose middle cell is the guide (D-056).

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useGuide } from "@/components/guide/GuideProvider";
import { GuideBot } from "@/components/guide/GuideBot";
import { cn } from "@/lib/utils";

export function GuideLauncher() {
  const { enabled, open, setOpen } = useGuide();
  const pathname = usePathname();
  // Not where the guide already has its own section (the home page): checked by the section itself, not only
  // by the address, so it can't slip back (owner, 2026-10-25: "on desktop homepage there is still that ask my ai
  // guide floating button").
  const [hasSection, setHasSection] = useState(false);
  useEffect(() => {
    const look = () => setHasSection(document.getElementById("ai-guide") !== null);
    look();
    const t = setTimeout(look, 600); // after a client navigation's new page has mounted
    return () => clearTimeout(t);
  }, [pathname]);
  if (!enabled || pathname === "/" || hasSection) return null;
  const hidden = open;

  return (
    <button
      type="button"
      data-capture-hide
      onClick={() => setOpen(true)}
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      className={cn(
        "group fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 hidden items-center lg:flex gap-2.5 rounded-full border border-white/15 bg-night/80 p-1.5 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.8)] backdrop-blur-xl transition-all duration-300 sm:right-6 sm:bottom-6 sm:pr-4",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember motion-safe:hover:-translate-y-0.5",
        hidden ? "pointer-events-none translate-y-4 opacity-0" : "opacity-100",
      )}
    >
      {/* The guide's own face, its state on it (D-060). */}
      <GuideBot className="size-11" />
      <span className="text-paper hidden text-sm font-medium sm:inline">Ask my AI guide</span>
    </button>
  );
}
