// components/guide/GuideLauncher.tsx
// The docked AI guide (PUBLIC-REDESIGN-PLAN §3a): the character's face in a
// glass ring, bottom right, on every page except the home page — which has
// the guide's own section, so a floating button there would only duplicate it
// (owner, 2026-09-30). It steps aside while the chat is open, and doesn't
// exist while the guide is switched off.

"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useGuide } from "@/components/guide/GuideProvider";
import { cn } from "@/lib/utils";

export function GuideLauncher() {
  const { enabled, ready, open, setOpen, ownerFirstName, mood } = useGuide();
  const pathname = usePathname();
  if (!enabled || pathname === "/") return null;
  const hidden = open;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Ask ${ownerFirstName}'s AI guide`}
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      className={cn(
        "group fixed right-4 bottom-4 z-40 flex items-center gap-2.5 rounded-full border border-white/15 bg-night/80 p-1.5 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.8)] backdrop-blur-xl transition-all duration-300 sm:right-6 sm:bottom-6 sm:pr-4",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember motion-safe:hover:-translate-y-0.5",
        hidden ? "pointer-events-none translate-y-4 opacity-0" : "opacity-100",
      )}
    >
      <span className="relative">
        <span aria-hidden="true" className="absolute -inset-1 rounded-full bg-[conic-gradient(from_0deg,var(--color-ember),transparent_40%,var(--color-ember))] opacity-60 blur-[2px] motion-safe:animate-[spin_6s_linear_infinite]" />
        <Image src="/character/guide-face.webp" alt="" width={44} height={44} className="relative size-11 rounded-full ring-2 ring-night" />
        <span aria-hidden="true" className={cn("absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-night", !ready ? "bg-line" : mood === "thinking" ? "bg-ember" : "bg-[var(--color-signal-finished-on-dark)]")} />
      </span>
      <span className="text-paper hidden text-sm font-medium sm:inline">Ask my AI guide</span>
    </button>
  );
}
