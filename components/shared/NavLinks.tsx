// components/shared/NavLinks.tsx
// Primary nav: pill links with an active state (filled pill + ember dot,
// plus aria-current so it isn't colour alone). Below md, a Menu button opens
// a full-width glass panel. The panel is open *for a given path*, so any
// navigation closes it without an effect.

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { SHEETS } from "@/lib/content/sheets";
import { cn } from "@/lib/utils";

const NAV = SHEETS.filter((s) => s.href !== "/");

export function NavLinks() {
  const pathname = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav aria-label="Primary" className="hidden md:block">
        <ul className="flex items-center gap-1">
          {NAV.map((s) => {
            const active = isActive(s.href);
            return (
              <li key={s.href}>
                <Link
                  href={s.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ember",
                    active ? "bg-white/10 text-paper" : "text-mist hover:bg-white/5 hover:text-paper",
                  )}
                >
                  {active && <span aria-hidden="true" className="size-1.5 rounded-full bg-ember" />}
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-paper focus-visible:outline-2 focus-visible:outline-ember md:hidden"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpenFor(open ? null : pathname)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="absolute inset-x-0 top-full border-b border-white/10 bg-night-deep/95 backdrop-blur-xl md:hidden"
        >
          <ul className="mx-auto max-w-6xl px-6 py-3">
            {NAV.map((s) => {
              const active = isActive(s.href);
              return (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-3.5 text-lg transition-colors",
                      active ? "bg-white/10 text-paper" : "text-mist hover:bg-white/5 hover:text-paper",
                    )}
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-line">{s.number}</span>
                      {s.label}
                    </span>
                    {active ? (
                      <span aria-hidden="true" className="size-2 rounded-full bg-ember" />
                    ) : (
                      <ArrowUpRight className="size-4 text-line" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
}
