// components/admin/ConfirmDelete.tsx
// Permanently deleting an earlier version of an image (BR-1.17 / BR-1.18 as
// amended, D-054) is the one irreversible action in the image history, so it
// asks twice: "Delete" turns into "Delete permanently" beside "Keep it", and only
// the second click acts. Replacing an image never needs this — the old one stays
// in the history until the owner deletes it here.

"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

export function ConfirmDelete({ onConfirm, busy = false, label = "Delete" }: { onConfirm: () => void; busy?: boolean; label?: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" disabled={busy} onClick={() => setAsking(true)} className="text-slate hover:text-critical inline-flex items-center gap-1 font-medium transition-colors disabled:opacity-50">
        <Trash2 aria-hidden="true" className="size-3.5" /> {label}
      </button>
    );
  }
  return (
    <span role="group" aria-label="Confirm the permanent delete" className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
        className="bg-critical text-paper inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium disabled:opacity-50"
      >
        <Trash2 aria-hidden="true" className="size-3.5" /> Delete permanently
      </button>
      <button type="button" onClick={() => setAsking(false)} className="text-slate hover:text-ink font-medium">
        Keep it
      </button>
    </span>
  );
}
