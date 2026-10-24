// components/admin/AdminShell.tsx
// The admin panel's frame (#104, rebuilt in the admin pass, D-057): one tool,
// not sixteen pages.
//
//   laptop  a graphite sidebar grouped by what the owner is doing, each page
//           with the count of what waits on it; above every page a slim bar —
//           where you are (Systems › Xkimi Xa Mali), "Open on the site" when
//           the page edits one, and search (⌘K)
//   phone   a top bar with the mark, the page's name and search; a dock at the
//           thumb — Overview · Inbox · Systems · Content · Menu, with the
//           counts — and Menu opens every page with what it's for
//
// The counts and the search index come from the layout (getAdminShell), which
// re-reads them whenever an editor refreshes. Sign-out ends every session
// (POST /admin/auth/logout).

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronRight, LogOut, Menu, Search, X } from "lucide-react";
import { BrandMark } from "@/components/shared/BrandMark";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { ADMIN_DOCK, ADMIN_GROUPS, ADMIN_PAGES, adminPageFor, isAdminPageActive, type AdminPage } from "@/lib/admin/nav";
import type { AdminShellData } from "@/lib/queries/admin-shell";
import { cn } from "@/lib/utils";

function Count({ n, className }: { n: number | undefined; className?: string }) {
  if (!n) return null;
  return <span className={cn("bg-ember text-ink inline-flex min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[11px] leading-5 font-medium", className)}>{n > 99 ? "99+" : n}</span>;
}

/** The record a detail page is about, for the breadcrumb and "Open on the site". */
function recordFor(pathname: string, data: AdminShellData) {
  const system = pathname.match(/^\/admin\/systems\/([^/]+)/)?.[1];
  if (system) {
    const s = data.systems.find((x) => x.id === system);
    return s ? { label: s.name, sitePath: s.published ? `/systems/${s.slug}` : null } : null;
  }
  const inquiry = pathname.match(/^\/admin\/inquiries\/([^/]+)/)?.[1];
  if (inquiry) {
    const i = data.inquiries.find((x) => x.id === inquiry);
    return i ? { label: i.reference, sitePath: null } : null;
  }
  return null;
}

export function AdminShell({ data, children }: { data: AdminShellData; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuOpen = menuFor === pathname;
  const menuButton = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  const page = adminPageFor(pathname);
  const group = ADMIN_GROUPS.find((g) => g.pages.some((p) => p.href === page?.href));
  const record = recordFor(pathname, data);
  const sitePath = record ? record.sitePath : page?.sitePath;
  const countOf = (p: AdminPage) => (p.count ? data.counts[p.count] : 0);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/v1/admin/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/admin/login?reason=signed_out");
    router.refresh();
  }

  // ⌘K / Ctrl+K opens the search from anywhere in the admin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // The phone menu: the page behind doesn't scroll, Escape closes, focus returns to Menu.
  useEffect(() => {
    if (!menuOpen) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const opener = menuButton.current;
    sheet.current?.querySelector<HTMLElement>("a[href]")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuFor(null);
    document.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = before;
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [menuOpen]);

  const navList = (onPick?: () => void, withHints = false) => (
    <nav aria-label="Admin" className="flex flex-col gap-6">
      {ADMIN_GROUPS.map((g) => (
        <div key={g.label || "top"}>
          {g.label && <p className="text-line mb-2 px-3 font-mono text-[11px] tracking-[0.06em] uppercase">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.pages.map((p) => {
              const active = isAdminPageActive(pathname, p.href);
              return (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    onClick={onPick}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                      withHints ? "min-h-14 py-2" : "min-h-10 py-2",
                      active ? "text-paper bg-white/10" : "text-mist hover:text-paper hover:bg-white/5",
                    )}
                  >
                    <p.Icon aria-hidden="true" className={cn("size-4 shrink-0", active ? "text-ember" : "text-line")} />
                    <span className="min-w-0 flex-1">
                      <span className="block">{p.label}</span>
                      {withHints && <span className="text-line block truncate text-xs">{p.hint}</span>}
                    </span>
                    <Count n={countOf(p)} />
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
    <div className="space-y-1 border-t border-white/10 p-3">
      <Link href="/" className="text-mist hover:text-paper flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm hover:bg-white/5">
        <BrandMark cut="heavy" className="text-mist h-3.5" />
        View the site
      </Link>
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="text-mist hover:text-paper flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm transition-colors hover:bg-white/5 disabled:opacity-60"
      >
        <LogOut aria-hidden="true" className="text-line size-4" />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );

  const searchButton = (compact: boolean) => (
    <button
      type="button"
      onClick={() => setSearching(true)}
      aria-label={compact ? "Search the admin" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border transition-colors",
        compact
          ? "text-mist hover:text-paper size-10 justify-center border-white/12 bg-white/[0.04]"
          : "border-ink/12 bg-sheet text-slate hover:border-ink/25 hover:text-ink h-9 ps-3 pe-2 text-sm shadow-soft",
      )}
    >
      <Search aria-hidden="true" className="size-4" />
      {!compact && (
        <>
          <span>Search</span>
          <kbd className="border-ink/12 text-slate rounded-md border px-1.5 font-mono text-[11px]">⌘K</kbd>
        </>
      )}
    </button>
  );

  return (
    <div className="bg-paper min-h-screen lg:flex">
      {/* Laptop: the graphite sidebar. */}
      <aside className="bg-night-deep text-paper sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 lg:flex">
        <Link href="/admin" className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-6">
          <BrandMark cut="heavy" className="text-paper h-6" />
          <span>
            <span className="block font-mono text-sm font-medium">MALULEKE-KS</span>
            <span className="text-line block text-xs">Admin</span>
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto px-3 py-5">{navList()}</div>
        {footer}
      </aside>

      <div className="min-w-0 flex-1">
        {/* Phone: the top bar. */}
        <div data-chrome className="bg-night-deep text-paper sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/10 px-4 lg:hidden">
          <Link href="/admin" aria-label="Admin overview" className="flex items-center">
            <BrandMark cut="heavy" className="text-paper h-5" />
          </Link>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{record?.label ?? page?.label ?? "Admin"}</span>
          {sitePath && (
            <a href={sitePath} aria-label="Open on the site" className="text-mist hover:text-paper inline-flex size-10 items-center justify-center rounded-full">
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          )}
          {searchButton(true)}
        </div>

        {/* Laptop: the page bar — where you are, the public page, search. */}
        <div data-chrome className="border-ink/[0.07] bg-paper/85 sticky top-0 z-30 hidden h-14 items-center gap-4 border-b px-8 backdrop-blur lg:flex">
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="text-slate flex items-center gap-1.5 text-sm">
              {group?.label && (
                <li className="flex items-center gap-1.5">
                  {group.label}
                  <ChevronRight aria-hidden="true" className="text-slate/50 size-3.5" />
                </li>
              )}
              {page && (
                <li className="flex min-w-0 items-center gap-1.5">
                  {record ? (
                    <Link href={page.href} className="hover:text-ink">
                      {page.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-ink font-medium">
                      {page.label}
                    </span>
                  )}
                </li>
              )}
              {record && (
                <li className="flex min-w-0 items-center gap-1.5">
                  <ChevronRight aria-hidden="true" className="text-slate/50 size-3.5 shrink-0" />
                  <span aria-current="page" className="text-ink truncate font-medium">
                    {record.label}
                  </span>
                </li>
              )}
            </ol>
          </nav>
          {sitePath && (
            <a href={sitePath} className="text-slate hover:text-ink inline-flex items-center gap-1.5 text-sm font-medium">
              Open on the site <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          )}
          {searchButton(false)}
        </div>

        <main id="main" className="min-w-0">
          <div className="mx-auto w-full max-w-6xl px-5 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pt-10 lg:pb-10">{children}</div>
        </main>
      </div>

      {/* Phone: the dock at the thumb. */}
      <nav data-dock="admin" data-chrome aria-label="Admin quick navigation" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        <ul className="bg-night-deep/90 mx-auto grid h-16 max-w-md grid-cols-5 items-center rounded-full border border-white/10 p-1 shadow-[0_18px_50px_-14px_rgb(0_0_0/0.6)] backdrop-blur-xl">
          {ADMIN_DOCK.map((href) => {
            const p = ADMIN_PAGES.find((x) => x.href === href)!;
            const active = isAdminPageActive(pathname, href);
            return (
              <li key={href} className="flex">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-full text-[12px] font-medium transition-colors",
                    active ? "text-paper bg-white/10" : "text-mist hover:text-paper",
                  )}
                >
                  <span className="relative">
                    <p.Icon aria-hidden="true" className={cn("size-5", active && "text-ember")} />
                    <Count n={countOf(p)} className="absolute -top-1.5 -right-3 min-w-4 px-1 text-[10px] leading-4" />
                  </span>
                  <span className="leading-none">{p.href === "/admin/inquiries" ? "Inbox" : p.href === "/admin/content" ? "Content" : p.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex">
            <button
              ref={menuButton}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="admin-menu"
              onClick={() => setMenuFor(pathname)}
              className="text-mist hover:text-paper flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-full text-[12px] font-medium"
            >
              <Menu aria-hidden="true" className="size-5" />
              <span className="leading-none">Menu</span>
            </button>
          </li>
        </ul>
      </nav>

      {menuOpen && (
        <div ref={sheet} id="admin-menu" role="dialog" aria-modal="true" aria-label="Admin menu" className="bg-night-deep text-paper fixed inset-0 z-50 flex flex-col lg:hidden">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
            <span className="flex items-center gap-2.5">
              <BrandMark cut="heavy" className="text-paper h-5" />
              <span className="font-mono text-sm">Admin</span>
            </span>
            <button type="button" onClick={() => setMenuFor(null)} className="text-mist hover:text-paper inline-flex size-10 items-center justify-center rounded-full border border-white/12">
              <X aria-hidden="true" className="size-5" />
              <span className="sr-only">Close the menu</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-5">{navList(() => setMenuFor(null), true)}</div>
          <div className="pb-[env(safe-area-inset-bottom)]">{footer}</div>
        </div>
      )}

      <AdminSearch open={searching} onOpenChange={setSearching} data={data} />
    </div>
  );
}
