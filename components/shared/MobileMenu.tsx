// components/shared/MobileMenu.tsx
// The phone and tablet menu (below lg; owner, 2026-10-01: "the nav and its
// navigation should be done at the highest level for mobile"). One button at
// the right of the bar opens a full-screen sheet:
//
//   top       the mark and a close button, where the bar was
//   middle    every page as a large numbered line with what it holds; the
//             current page marked in ember (and aria-current, not colour alone)
//   bottom    Let's talk, the owner's links, and the review promise
//
// The page behind is frozen (no scroll) and inert to the keyboard: focus moves
// into the sheet, Tab stays inside it, Escape or the close button closes it
// and focus returns to the Menu button. Opening is tied to the current path,
// so following any link closes it without an effect. It renders into <body>:
// the header's glass (backdrop-filter) would otherwise trap a fixed sheet.
// Reduced motion: it appears at once, no stagger.

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, Clock, Menu, X, FileDown } from "lucide-react";
import { CubeMark } from "@/components/shared/BrandMark";
import { SocialLinks } from "@/components/shared/SocialLinks";
import { SHEETS } from "@/lib/content/sheets";
import type { SiteLink } from "@/lib/queries/site";
import { cn } from "@/lib/utils";

const PAGES = SHEETS.filter((s) => s.href !== "/contact");
const EASE = [0.2, 0.8, 0.2, 1] as const;

export function MobileMenu({ links, reviewSlaHours, cvUrl = null }: { links: SiteLink[]; reviewSlaHours: number; cvUrl?: string | null }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const open = openFor === pathname;
  const button = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  // eslint-disable-next-line react-hooks/set-state-in-effect -- the portal needs <body>, which exists only after hydration
  useEffect(() => setMounted(true), []);

  // While open: the page doesn't scroll, focus lives in the sheet, Escape closes.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const opener = button.current;
    const t = setTimeout(() => sheet.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFor(null);
      if (e.key !== "Tab" || !sheet.current) return;
      const items = [...sheet.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      root.style.overflow = before;
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open]);

  const item = (i: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE, delay: 0.06 + i * 0.045 } },
        };

  return (
    <div className="lg:hidden">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpenFor(pathname)}
        className="text-paper focus-visible:outline-ember inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] ps-3 pe-3.5 text-sm font-medium transition-colors hover:bg-white/[0.09] focus-visible:outline-2"
      >
        <Menu aria-hidden="true" className="size-4" />
        Menu
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="menu"
                ref={sheet}
                id="mobile-menu"
                role="dialog"
                aria-modal="true"
                aria-label="Menu"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.22 } }}
                exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.18 } }}
                className="text-paper fixed inset-0 z-[60] flex flex-col overflow-y-auto overscroll-contain bg-night-deep/[0.97] backdrop-blur-2xl"
              >
                {/* One quiet glow, top right — the sheet's only decoration. */}
                <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-24 size-[26rem] rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.22),transparent)]" />

                <div className="relative flex h-[4.25rem] shrink-0 items-center justify-between px-6">
                  <Link href="/" onClick={() => setOpenFor(null)} aria-label="MALULEKE-KS — home" className="group focus-visible:outline-ember flex h-10 items-center gap-2.5 rounded-full focus-visible:outline-2">
                    <CubeMark className="size-9" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOpenFor(null)}
                    className="focus-visible:outline-ember inline-flex size-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] transition-colors hover:bg-white/[0.09] focus-visible:outline-2"
                  >
                    <X aria-hidden="true" className="size-5" />
                    <span className="sr-only">Close the menu</span>
                  </button>
                </div>

                <nav aria-label="Primary" className="relative flex-1 px-4 pt-4 pb-8">
                  <ol className="border-t border-white/[0.07]">
                    {PAGES.map((s, i) => {
                      const active = isActive(s.href);
                      return (
                        <motion.li key={s.href} {...item(i)} className="border-b border-white/[0.07]">
                          <Link
                            href={s.href}
                            data-autofocus={i === 0 ? true : undefined}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setOpenFor(null)}
                            className="group focus-visible:outline-ember flex min-h-[4.5rem] items-center gap-4 rounded-2xl px-2 py-3 focus-visible:outline-2 active:bg-white/[0.04]"
                          >
                            <span className={cn("type-data w-6 shrink-0 text-xs", active ? "text-ember" : "text-line")}>{s.number}</span>
                            <span className="min-w-0 flex-1">
                              <span className={cn("block text-[1.75rem] leading-tight font-semibold tracking-tight", active ? "text-paper" : "text-paper/80")}>{s.label}</span>
                              <span className="text-mist mt-0.5 block text-sm">{s.hint}</span>
                            </span>
                            {active ? (
                              <span aria-hidden="true" className="bg-ember size-2.5 shrink-0 rounded-full shadow-[0_0_14px_rgb(255_91_31/0.8)]" />
                            ) : (
                              <ArrowUpRight aria-hidden="true" className="text-line size-5 shrink-0 transition-transform group-active:translate-x-0.5 group-active:-translate-y-0.5" />
                            )}
                          </Link>
                        </motion.li>
                      );
                    })}
                  </ol>
                </nav>

                <motion.div {...item(PAGES.length)} className="relative shrink-0 border-t border-white/[0.07] px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                  <Link
                    href="/contact"
                    onClick={() => setOpenFor(null)}
                    className="bg-ember text-ink shadow-glow-ember focus-visible:outline-ember flex h-13 items-center justify-center gap-2 rounded-full text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.99]"
                  >
                    Let&rsquo;s talk <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                  {/* The uploaded CV, while it's switched on — the phone's way to it (no CV page). */}
                  {cvUrl && (
                    <a
                      href={cvUrl}
                      className="text-paper focus-visible:outline-ember mt-3 flex h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <FileDown aria-hidden="true" className="size-4" /> Download my CV
                    </a>
                  )}
                  <p className="text-mist mt-4 flex items-center justify-center gap-1.5 text-xs">
                    <Clock aria-hidden="true" className="size-3.5" /> Every inquiry is reviewed within {reviewSlaHours} hours
                  </p>
                  {/* Public profiles only — the email and WhatsApp number live on /contact (spec WP-105). */}
                  <SocialLinks links={links.filter((l) => !l.url.includes("wa.me"))} className="mt-5 justify-center" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
