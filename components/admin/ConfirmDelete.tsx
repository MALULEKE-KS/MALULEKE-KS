// components/admin/ConfirmDelete.tsx
// A remove button that asks once (#104): the first press turns it into
// "Remove?", the second does it; it settles back after a few seconds or when
// focus leaves. No browser dialogs — they block the page.

"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SETTLE_MS = 4000;

export function ConfirmDelete({ label, onConfirm, className }: { label: string; onConfirm: () => void | Promise<void>; className?: string }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), SETTLE_MS);
    return () => clearTimeout(t);
  }, [armed]);

  async function press() {
    if (!armed) return setArmed(true);
    setBusy(true);
    await onConfirm();
    setBusy(false);
    setArmed(false);
  }

  return (
    <button
      type="button"
      onClick={press}
      onBlur={() => setArmed(false)}
      disabled={busy}
      aria-label={armed ? `Confirm removing ${label}` : `Remove ${label}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg p-1.5 text-xs font-medium transition-colors disabled:opacity-50",
        armed ? "bg-critical px-2 text-paper" : "text-slate hover:bg-critical/10 hover:text-critical",
        className,
      )}
    >
      {armed ? "Remove?" : <Trash2 aria-hidden="true" className="size-4" />}
    </button>
  );
}
