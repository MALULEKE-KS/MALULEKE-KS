// components/admin/LeaveGuard.tsx
// Unsaved changes are never lost by a stray click (D-057). While a form has
// changes, following a link inside the admin stops and asks — in the page, at
// the foot of the screen: "Leave without saving" or "Stay". Closing or
// reloading the tab gets the browser's own question, the only one a page may
// ask then. Nothing is asked once the changes are saved or discarded.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { adminButton } from "@/components/admin/ui";

export function LeaveGuard({ dirty, changes }: { dirty: boolean; changes: number }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // a jump within the page
      e.preventDefault();
      e.stopPropagation();
      setPending(url.pathname + url.search + url.hash);
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [dirty]);

  if (!pending || !dirty) return null;
  return (
    <div role="alertdialog" aria-labelledby="leave-guard-title" className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg lg:bottom-6">
      <div className="border-ink/10 bg-sheet shadow-lift flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center">
        <p id="leave-guard-title" className="text-ink flex flex-1 items-center gap-2 text-sm font-medium">
          <TriangleAlert aria-hidden="true" className="text-accent size-4 shrink-0" />
          {changes} unsaved change{changes === 1 ? "" : "s"} here.
        </p>
        <div className="flex gap-2">
          <button type="button" autoFocus className={adminButton.secondary} onClick={() => setPending(null)}>
            Stay
          </button>
          <button
            type="button"
            className={adminButton.danger}
            onClick={() => {
              const to = pending;
              setPending(null);
              router.push(to);
            }}
          >
            Leave without saving
          </button>
        </div>
      </div>
    </div>
  );
}
