// components/shared/NavLinks.tsx
// The primary nav (F5c, D10), inside the header bar. A soft highlight glides
// under the pointer from link to link; the current page has an ember
// underline that slides to the new page when you navigate (plus
// aria-current, so it isn't colour alone). Below lg, a Menu button opens a
// glass sheet under the bar with the same items numbered as sheets. The
// sheet is open *for a given path*, so any navigation closes it without an
// effect; Escape closes it too.

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { SHEETS } from "@/lib/content/sheets";
import { cn } from "@/lib/utils";

const NAV = SHEETS.filter((s) => s.inHeader);
const SPRING = { type: "spring", stiffness: 420, damping: 36 } as const;

export function NavLinks() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const open = openFor === pathname;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const transition = reduced ? { duration: 0 } : SPRING;

  return (
    <>
      <nav aria-label="Primary" className="hidden lg:block">
        <ul className="flex items-center" onMouseLeave={() => setHovered(null)}>
          {NAV.map((s) => {
            const active = isActive(s.href);
            return (
              <li key={s.href} onMouseEnter={() => setHovered(s.href)}>
                <Link
                  href={s.href}
                  aria-current={active ? "page" : undefined}
                  onFocus={() => setHovered(s.href)}
                  onBlur={() => setHovered(null)}
                  className={cn(
                    "relative inline-flex h-9 items-center rounded-full px-3.5 text-sm transition-colors focus-visible:outline-none",
                    active ? "text-paper" : "text-mist hover:text-paper",
                  )}
                >
                  {hovered === s.href && (
                    <motion.span layoutId="nav-hover" transition={transition} aria-hidden="true" className="absolute inset-0 rounded-full bg-white/[0.08]" />
                  )}
                  <span className="relative">{s.label}</span>
                  {active && (
                    <motion.span layoutId="nav-active" transition={transition} aria-hidden="true" className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-ember" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="lg:hidden">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm text-paper hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-ember"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpenFor(open ? null : pathname)}
        >
          {open ? <X aria-hidden="true" className="size-4" /> : <Menu aria-hidden="true" className="size-4" />}
          Menu
        </button>

        {open && (
          <nav
            id="mobile-nav"
            aria-label="Primary"
            onKeyDown={(e) => e.key === "Escape" && setOpenFor(null)}
            className="absolute inset-x-2 top-full mt-2 rounded-3xl border border-white/10 bg-night-deep/90 p-2 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.9)] backdrop-blur-xl"
          >
            <ul>
              {NAV.map((s) => {
                const active = isActive(s.href);
                return (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-2xl px-4 py-3.5 text-lg transition-colors",
                        active ? "bg-white/10 text-paper" : "text-mist hover:bg-white/5 hover:text-paper",
                      )}
                    >
                      <span className="flex items-baseline gap-3">
                        <span className="font-mono text-xs text-line">{s.number}</span>
                        {s.label}
                      </span>
                      {active ? <span aria-hidden="true" className="size-2 rounded-full bg-ember" /> : <ArrowUpRight className="size-4 text-line" aria-hidden="true" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </>
  );
}
