// lib/guide/spotlight.ts
// Lighting up a section while a tour is there (docs/AI-GUIDE-PHASE2-PLAN.md §7):
// scroll the section into view, mark it for a few seconds (the owner's setting in
// the "guide-tours" block), then let it go. Visual only — it reads the page, it never
// changes it; and nothing happens for a section that isn't there. The mark is the
// `guide-spotlight` class (app/globals.css), which respects reduced motion.

const CLASS = "guide-spotlight";
const WAIT_FOR_PAGE_MS = 1800;
const POLL_MS = 120;

let clearTimer: ReturnType<typeof setTimeout> | undefined;
let pollTimer: ReturnType<typeof setTimeout> | undefined;

/** Light up the element with this id, waiting briefly for the page to arrive. */
export function spotlight(anchor: string | null, seconds: number): void {
  if (typeof document === "undefined") return;
  clearTimeout(clearTimer);
  clearTimeout(pollTimer);
  for (const el of document.querySelectorAll(`.${CLASS}`)) el.classList.remove(CLASS);
  if (!anchor || !/^[a-z0-9-]+$/.test(anchor)) return;

  const started = Date.now();
  const look = () => {
    const el = document.getElementById(anchor);
    if (!el) {
      if (Date.now() - started < WAIT_FOR_PAGE_MS) pollTimer = setTimeout(look, POLL_MS);
      return;
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    el.classList.add(CLASS);
    clearTimer = setTimeout(() => el.classList.remove(CLASS), seconds * 1000);
  };
  look();
}
