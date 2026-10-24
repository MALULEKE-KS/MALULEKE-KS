// components/shared/SearchPalette.tsx
// Instant search (approved feature 5, #100): ⌘K / Ctrl+K or "/" opens a
// command palette over published systems, journey entries and skills
// (GET /api/v1/search — public views only, so a result is never hidden work;
// rate-limited per visitor). Results come from the server, ranked; the palette
// doesn't filter them again. Keyboard-first (cmdk + Radix: arrows, Enter, Esc,
// focus trap), and it degrades to a plain button that opens it.
//
// Only the button and the shortcuts load with the page (D-062): the dialog — cmdk and the
// Radix dialog — comes the first time it opens (fetched early when the pointer or focus
// reaches the button, so it still opens at once).

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";

const load = () => import("@/components/shared/SearchDialog");
const SearchDialog = dynamic(load, { ssr: false });
const preload = () => void load();

const noSubscribe = () => () => {};
const isMacPlatform = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  // Mounted once first opened, then kept, so closing and reopening is instant.
  const [wanted, setWanted] = useState(false);
  // The shortcut hint: "Ctrl K" on the server, the platform's own on the client.
  const isMac = useSyncExternalStore(noSubscribe, isMacPlatform, () => false);

  useEffect(() => {
    if (open) setWanted(true); // eslint-disable-line react-hooks/set-state-in-effect -- the dialog mounts on first open
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onPointerEnter={preload}
        onFocus={preload}
        className="tap-target text-mist hover:text-paper focus-visible:outline-ember inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm transition-colors hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 lg:min-w-44 lg:border lg:border-white/12 lg:bg-white/[0.04] lg:pe-1.5 lg:group-data-[scrolled]/header:min-w-36"
        aria-label="Search the site"
      >
        <Search aria-hidden="true" className="size-4" />
        <span className="hidden lg:inline">Search</span>
        <kbd aria-hidden="true" className="text-line ms-auto hidden rounded-md border border-white/10 px-1.5 font-mono text-[0.6875rem] lg:inline">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>
      {(open || wanted) && <SearchDialog open={open} setOpen={setOpen} />}
    </>
  );
}
