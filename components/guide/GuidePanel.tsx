// components/guide/GuidePanel.tsx
// The AI guide on every page but the home page (PUBLIC-REDESIGN-PLAN §3a,
// docs/AI-GUIDE-PHASE1-PLAN.md §3): a panel on desktop, a bottom sheet on
// phones, holding the same console — and the same conversation
// (GuideChatProvider) — as the home page's own section, which is why it
// doesn't exist there.
//
// The accessible interface to the guide (the character is decorative): a
// labelled dialog, focus moves in on open and back on close, Escape closes.

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useGuide } from "@/components/guide/GuideProvider";
import { GuideConsole } from "@/components/guide/console/GuideConsole";

export function GuidePanel() {
  const { enabled, open, setOpen } = useGuide();
  const pathname = usePathname();
  const openerRef = useRef<Element | null>(null);
  const home = pathname === "/";

  // Focus in on open, back to where it came from on close; Escape closes.
  useEffect(() => {
    if (!open || home) return;
    openerRef.current = document.activeElement;
    const t = setTimeout(() => document.getElementById("guide-input-panel")?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [open, home, setOpen]);

  if (!enabled || home) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="guide-title-panel"
      hidden={!open}
      className={
        "fixed z-50 rounded-t-3xl bg-[linear-gradient(160deg,rgb(255_91_31/0.55),rgb(255_255_255/0.08)_35%,rgb(96_130_170/0.35))] p-px shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] " +
        "inset-x-0 bottom-0 h-[88dvh] motion-safe:animate-[guide-in_320ms_cubic-bezier(0.2,0.8,0.2,1)] " +
        "sm:inset-x-auto sm:right-5 sm:bottom-5 sm:h-[min(720px,calc(100dvh-2.5rem))] sm:w-[460px] sm:rounded-3xl"
      }
    >
      <div className="text-paper bg-night/95 relative h-full overflow-hidden rounded-t-[23px] backdrop-blur-2xl sm:rounded-[23px]">
        <GuideConsole variant="panel" onClose={() => setOpen(false)} onNavigate={() => window.innerWidth < 640 && setOpen(false)} />
      </div>
    </div>
  );
}
