// components/shared/NavLinks.tsx
// The primary nav (F5c, D10), inside the header bar. A soft highlight glides
// under the pointer from link to link; the current page has an ember
// underline that slides to the new page when you navigate (plus
// aria-current, so it isn't colour alone). Desktop only — below lg the
// header shows MobileMenu instead.
//
// Systems carries a preview (docs/improvements/HOME-HERO-PLAN.md §17, D-037):
// point at it, or tab to it, and the owner's featured systems appear under it
// with their live status and a link to all of them — real data from the public
// views, nothing typed in. The link itself still navigates (the preview is an
// addition, never a gate): it opens on hover and on keyboard focus, closes with
// Escape, and works without any pointer. At the top of the page the links sit
// in a quiet glass pill so they read over the cover image; once the header
// gathers into its capsule, the capsule is the glass.

"use client";

import { useEffect, useState } from "react";
import Link from "@/components/shared/IntentLink";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SHEETS } from "@/lib/content/sheets";
import type { HeaderSystems } from "@/lib/queries/header";
import { cn } from "@/lib/utils";

const NAV = SHEETS.filter((s) => s.inHeader);
const SPRING = { type: "spring", stiffness: 420, damping: 36 } as const;
/** The nav item that carries the preview. */
const PREVIEW_HREF = "/systems";

interface NavLinksProps {
  preview: HeaderSystems | null;
  /** The owner's wording: the preview's accessible name and its "all systems" link ({count} is filled in). Either missing → that part is not shown. */
  previewLabel: string | null;
  allLabel: string | null;
}

export function NavLinks({ preview, previewLabel, allLabel }: NavLinksProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);
  // Escape closes the preview until the pointer or focus leaves the item.
  const [dismissed, setDismissed] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const transition = reduced ? { duration: 0 } : SPRING;
  const hasPreview = Boolean(preview && preview.systems.length > 0);

  // Escape closes the preview wherever focus is — including when it was opened with the pointer and focus is elsewhere.
  useEffect(() => {
    if (!hasPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDismissed(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hasPreview]);

  return (
    <nav aria-label="Primary" className="hidden lg:block">
      <ul
        className={cn(
          "flex items-center rounded-full border px-1 transition-[background-color,border-color,backdrop-filter] duration-500",
          // Top of the page: a quiet glass pill, so the links read over the cover image.
          "border-white/10 bg-night-deep/45 backdrop-blur-md",
          // Gathered: the capsule is the glass.
          "group-data-[scrolled]/header:border-transparent group-data-[scrolled]/header:bg-transparent group-data-[scrolled]/header:backdrop-blur-none",
        )}
        onMouseLeave={() => setHovered(null)}
      >
        {NAV.map((s) => {
          const active = isActive(s.href);
          const withPreview = s.href === PREVIEW_HREF && hasPreview;
          return (
            <li
              key={s.href}
              className="group/nav relative"
              onMouseEnter={() => setHovered(s.href)}
              onMouseLeave={() => setDismissed(false)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setDismissed(false);
              }}
            >
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                onFocus={() => setHovered(s.href)}
                onBlur={() => setHovered(null)}
                className={cn(
                  // Never wraps: in the gathered capsule a label broke mid-word ("System s").
                  "relative inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-none",
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

              {withPreview && preview && (
                <div
                  data-dismissed={dismissed || undefined}
                  className={cn(
                    // Hidden until the item is pointed at or has focus (and not dismissed); visibility:hidden keeps it out of the tab order until then.
                    "pointer-events-none invisible absolute top-full left-1/2 z-50 w-[23rem] -translate-x-1/2 pt-3 opacity-0 transition-[opacity,visibility] duration-200 motion-reduce:transition-none",
                    "group-hover/nav:pointer-events-auto group-hover/nav:visible group-hover/nav:opacity-100",
                    "group-focus-within/nav:pointer-events-auto group-focus-within/nav:visible group-focus-within/nav:opacity-100",
                    "data-[dismissed]:pointer-events-none data-[dismissed]:invisible data-[dismissed]:opacity-0",
                  )}
                >
                  <div className="shadow-lift rounded-2xl border border-white/10 bg-night-deep/92 p-2 backdrop-blur-xl">
                    <ul aria-label={previewLabel ?? undefined} className="flex flex-col">
                      {preview.systems.map((system) => (
                        <li key={system.slug}>
                          <Link
                            href={`/systems/${system.slug}`}
                            className="hover:bg-white/[0.06] focus-visible:outline-ember flex items-start justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors focus-visible:outline-2"
                          >
                            <span className="min-w-0">
                              <span className="text-paper block truncate text-sm font-medium">{system.name}</span>
                              {system.meta && <span className="text-mist mt-0.5 block truncate text-xs">{system.meta}</span>}
                            </span>
                            <StatusBadge label={system.statusLabel} colorToken={system.statusColorToken} onDark />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {allLabel && (
                      <Link
                        href={PREVIEW_HREF}
                        className="text-mist hover:text-paper focus-visible:outline-ember mt-1 flex items-center justify-between rounded-xl border-t border-white/10 px-3 pt-3 pb-2 text-sm transition-colors focus-visible:outline-2"
                      >
                        {allLabel.replaceAll("{count}", String(preview.total))}
                        <span aria-hidden="true">→</span>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
