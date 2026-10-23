// components/shared/BottomDock.tsx
// The phone's navigation (D-056, the owner's U12 and D2-A, 2026-10-23: "the
// mobile menu has to be done at the highest level ... the best header of all").
// Below lg the pages live where a thumb rests: one glass capsule floating at
// the foot of the screen, five cells —
//
//   Systems · Journey · [the guide] · About · Menu
//
// The guide sits in the middle, raised — its own face, the orb (D-060), its
// state on it; while the guide is switched off (BR-4.4) the middle holds Let's
// talk instead, so the dock never has a hole. The current page is marked by a
// lit cell that glides between pages (and aria-current, not colour alone).
// Menu opens the full sheet (MobileMenu) — every page with what it holds, the
// CV, the owner's links. Home is the mark in the header.
//
// The dock holds still while pages cross-fade (its own view-transition name),
// steps aside while the guide's panel is open, and sets data-dock on <html> so
// what floats at the foot of a page (the consent card, the guide's corner
// button) and the page's own end sit above it. Every label is the owner's
// wording ("site-header" block); a label left empty hides its part.

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { LayoutGrid, MessageSquareText, Route, UserRound } from "lucide-react";
import { useGuide } from "@/components/guide/GuideProvider";
import { GuideBot } from "@/components/guide/GuideBot";
import type { HeaderLabels } from "@/components/shared/SiteHeader";
import { SHEETS } from "@/lib/content/sheets";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof LayoutGrid> = { "/systems": LayoutGrid, "/journey": Route, "/about": UserRound };
const sheet = (href: string) => SHEETS.find((s) => s.href === href);

export function BottomDock({ labels, menu }: { labels: HeaderLabels | null; /** The Menu cell — MobileMenu in its dock form. */ menu: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const { enabled, open, setOpen } = useGuide();
  const word = (s: string | undefined) => s?.trim() || null;
  const askLabel = word(labels?.askLabel);
  const contactLabel = word(labels?.contactLabel);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Tell the page the dock is there (below lg, CSS lifts what floats at the foot and pads the page's end).
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.dock = "";
    return () => {
      delete root.dataset.dock;
    };
  }, []);

  const cell = (href: string) => {
    const s = sheet(href);
    if (!s) return null;
    const Icon = ICONS[href] ?? LayoutGrid;
    const active = isActive(href);
    return (
      <li key={href} className="flex">
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "press relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-full text-[12px] font-medium transition-colors",
            active ? "text-paper" : "text-mist hover:text-paper",
          )}
        >
          {active && (
            <motion.span
              layoutId={reduced ? undefined : "dock-active"}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              aria-hidden="true"
              className="absolute inset-x-1 inset-y-1 rounded-full bg-white/[0.08] ring-1 ring-white/10"
            />
          )}
          <Icon aria-hidden="true" className={cn("relative size-5", active && "text-ember")} strokeWidth={active ? 2.2 : 1.8} />
          <span className="relative leading-none">{s.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav
      data-dock
      data-chrome
      aria-label={word(labels?.dockLabel) ?? "Pages"}
      data-capture-hide
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-[transform,opacity] duration-300 ease-out [view-transition-name:site-dock] motion-reduce:transition-none lg:hidden",
        open && "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <ul className="bg-night-deep/80 mx-auto grid h-16 max-w-md grid-cols-5 items-center rounded-full border border-white/10 p-1 shadow-[0_18px_50px_-14px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl backdrop-saturate-150">
        {cell("/systems")}
        {cell("/journey")}
        <li className="flex justify-center">
          {enabled && askLabel ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={word(labels?.askHint) ?? askLabel}
              className="press group relative -mt-5 flex flex-col items-center gap-1 text-[12px] font-medium"
            >
              {/* The guide's own face, raised out of the dock (D-060). */}
              <GuideBot className="size-14 drop-shadow-[0_10px_18px_rgb(0_0_0/0.55)]" />
              <span aria-hidden="true" className="text-paper leading-none">
                {askLabel}
              </span>
            </button>
          ) : contactLabel ? (
            <Link
              href="/contact"
              aria-current={isActive("/contact") ? "page" : undefined}
              className="press bg-ember text-ink shadow-glow-ember flex size-12 items-center justify-center rounded-full"
            >
              <MessageSquareText aria-hidden="true" className="size-5" />
              <span className="sr-only">{contactLabel}</span>
            </Link>
          ) : null}
        </li>
        {cell("/about")}
        <li className="flex">{menu}</li>
      </ul>
    </nav>
  );
}
