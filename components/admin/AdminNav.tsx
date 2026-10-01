// components/admin/AdminNav.tsx
// The admin panel's navigation (#104): grouped by what the owner is doing,
// the current section marked, a collapsible menu on small screens, and
// sign-out (POST /admin/auth/logout — ends every session).

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  FileText,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Leaf,
  ListChecks,
  LogOut,
  Menu,
  PenLine,
  Settings,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/shared/BrandMark";
import { cn } from "@/lib/utils";

const GROUPS: { label: string; items: { href: string; label: string; Icon: LucideIcon }[] }[] = [
  { label: "", items: [{ href: "/admin", label: "Overview", Icon: LayoutDashboard }] },
  {
    label: "Content",
    items: [
      { href: "/admin/systems", label: "Systems", Icon: Boxes },
      { href: "/admin/organizations", label: "Organisations", Icon: Building2 },
      { href: "/admin/timeline", label: "Journey", Icon: BookOpen },
      { href: "/admin/cv", label: "CV", Icon: FileText },
      { href: "/admin/profile", label: "Profile", Icon: UserRound },
      { href: "/admin/content", label: "Page content", Icon: PenLine },
    ],
  },
  { label: "Inbox", items: [{ href: "/admin/inquiries", label: "Inquiries", Icon: Inbox }] },
  {
    label: "Quality",
    items: [
      { href: "/admin/numbers", label: "Numbers", Icon: BarChart3 },
      { href: "/admin/freshness", label: "Freshness", Icon: Leaf },
      { href: "/admin/jobs", label: "Jobs", Icon: ListChecks },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/settings", label: "Settings", Icon: Settings },
      { href: "/admin/activity-log", label: "Activity log", Icon: Activity },
      { href: "/admin/account", label: "Account", Icon: KeyRound },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/v1/admin/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/admin/login?reason=signed_out");
    router.refresh();
  }

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
      {GROUPS.map((group) => (
        <div key={group.label || "top"}>
          {group.label && <p className="mb-2 px-3 font-mono text-[0.6875rem] text-line">{group.label}</p>}
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
                      active ? "bg-white/10 text-paper" : "text-mist hover:bg-white/5 hover:text-paper",
                    )}
                  >
                    <Icon aria-hidden="true" className={cn("size-4", active ? "text-ember" : "text-line")} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-3">
      <Link href="/" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-mist hover:bg-white/5 hover:text-paper">
        <BrandMark cut="heavy" className="h-3.5 text-mist" />
        View the site
      </Link>
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-mist transition-colors hover:bg-white/5 hover:text-paper focus-visible:outline-2 focus-visible:outline-ember disabled:opacity-60"
      >
        <LogOut aria-hidden="true" className="size-4 text-line" />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );

  return (
    <>
      {/* Small screens: a top bar with a menu. */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-night-deep px-4 text-paper lg:hidden">
        <Link href="/admin" className="flex items-center gap-2.5">
          <BrandMark cut="heavy" className="h-5 text-paper" />
          <span className="font-mono text-sm">Admin</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="admin-menu"
          className="rounded-lg p-2 text-mist hover:bg-white/10 hover:text-paper"
        >
          {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>
      {open && (
        <div id="admin-menu" className="fixed inset-x-0 top-14 bottom-0 z-40 flex flex-col bg-night-deep text-paper lg:hidden">
          {nav}
          {footer}
        </div>
      )}

      {/* Large screens: a fixed graphite sidebar. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-night-deep text-paper lg:flex">
        <Link href="/admin" className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <BrandMark cut="heavy" className="h-6 text-paper" />
          <span>
            <span className="block font-mono text-sm font-medium">MALULEKE-KS</span>
            <span className="block text-xs text-line">Admin</span>
          </span>
        </Link>
        {nav}
        {footer}
      </aside>
    </>
  );
}
