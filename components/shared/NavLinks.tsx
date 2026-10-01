// components/shared/NavLinks.tsx
// The primary nav (F5c, D10), inside the header bar. A soft highlight glides
// under the pointer from link to link; the current page has an ember
// underline that slides to the new page when you navigate (plus
// aria-current, so it isn't colour alone). Desktop only — below lg the
// header shows MobileMenu instead.

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { SHEETS } from "@/lib/content/sheets";
import { cn } from "@/lib/utils";

const NAV = SHEETS.filter((s) => s.inHeader);
const SPRING = { type: "spring", stiffness: 420, damping: 36 } as const;

export function NavLinks() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);
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

    </>
  );
}
