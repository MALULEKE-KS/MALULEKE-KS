// components/shared/NavLinks.tsx
// Primary nav with a current-sheet indicator (aria-current + amber rule —
// DESIGN-SYSTEM.md v2 §4.2, the accent marks "where you are"). Each link
// carries its sheet number in mono. Below md the nav collapses behind a
// Menu button into a full-width panel instead of wrapping onto two rows.

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SHEETS } from "@/lib/content/sheets";
import { cn } from "@/lib/utils";

const NAV = SHEETS.filter((s) => s.href !== "/");

export function NavLinks() {
  const pathname = usePathname();
  // The panel is open *for a given path*: navigating anywhere changes the
  // pathname, so it closes itself with no effect needed.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (fn: (v: boolean) => boolean) => setOpenFor(fn(open) ? pathname : null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav aria-label="Primary" className="hidden md:flex md:items-center md:gap-7">
        {NAV.map((s) => {
          const active = isActive(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative py-5 font-sans text-sm transition-colors",
                active ? "text-paper" : "text-mist hover:text-paper"
              )}
            >
              <span className="text-line group-hover:text-amber mr-1.5 font-mono text-xs">{s.number}</span>
              {s.label}
              <span
                aria-hidden="true"
                className={cn(
                  "bg-amber absolute inset-x-0 bottom-0 h-0.5 origin-left transition-transform duration-200",
                  active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                )}
              />
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        className="border-mist/40 text-paper focus-visible:outline-amber inline-flex items-center gap-2 border px-3 py-2 font-mono text-xs focus-visible:outline-2 md:hidden"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true" className="flex flex-col gap-1">
          <span className={cn("bg-paper block h-px w-4 transition-transform", open && "translate-y-[5px] rotate-45")} />
          <span className={cn("bg-paper block h-px w-4 transition-opacity", open && "opacity-0")} />
          <span
            className={cn("bg-paper block h-px w-4 transition-transform", open && "-translate-y-[5px] -rotate-45")}
          />
        </span>
        {open ? "Close" : "Menu"}
      </button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="border-line/20 bg-blueprint-deep absolute inset-x-0 top-full border-b md:hidden"
        >
          <ul className="mx-auto max-w-6xl px-6 py-2">
            {NAV.map((s) => {
              const active = isActive(s.href);
              return (
                <li key={s.href} className="border-line/15 border-b last:border-b-0">
                  <Link
                    href={s.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-baseline gap-3 py-4 font-sans text-lg",
                      active ? "text-amber" : "text-paper"
                    )}
                  >
                    <span className="text-line font-mono text-xs">{s.number}</span>
                    {s.label}
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
