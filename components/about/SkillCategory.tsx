// components/about/SkillCategory.tsx
// One skills category on /about as a native <details> (D-051): open everywhere
// by default (and always open from a tablet up — its summary doesn't toggle
// there), and on a phone the weaker categories fold away after load, so the
// section stays short; the strongest stay open. The page renders open, so
// without script everything is simply there; the fold happens below the first
// screen, so nothing the reader sees moves.

"use client";

import { useEffect, useRef } from "react";

export function SkillCategory({ openOnPhone, summary, children }: { openOnPhone: boolean; summary: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const phone = window.matchMedia("(max-width: 767.98px)");
    const apply = () => {
      if (!phone.matches) el.open = true;
      else if (!openOnPhone) el.open = false;
    };
    apply();
    phone.addEventListener("change", apply);
    return () => phone.removeEventListener("change", apply);
  }, [openOnPhone]);
  return (
    <details ref={ref} open className="group/s h-full">
      {summary}
      {children}
    </details>
  );
}
