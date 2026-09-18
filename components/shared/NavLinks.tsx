// components/shared/NavLinks.tsx
// Primary nav with a current-section indicator. Client component only
// because it needs usePathname; SiteHeader stays a server component.
//
// The indicator is brass (Design System §4.2 — brass is for flagship
// markers, active states and the numbers) and the state is also exposed as
// aria-current, so it isn't conveyed by color alone. A section matches on its
// path prefix, so /systems/xkimm-xa-mali keeps "Systems" marked.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/systems", label: "Systems" },
  { href: "/journey", label: "Journey" },
  { href: "/cv", label: "CV" },
  { href: "/how-i-build", label: "How I build" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-x-6">
      {NAV_LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            // py-2 keeps the tap target around 36px tall on a phone; the
            // border is the current-page mark, transparent otherwise so the
            // row doesn't shift when it appears.
            className={cn(
              "border-b-2 py-2 font-sans text-sm transition-colors",
              active ? "border-accent text-ink" : "border-transparent text-slate hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
