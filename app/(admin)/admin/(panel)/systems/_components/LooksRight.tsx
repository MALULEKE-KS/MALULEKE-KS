// app/(admin)/admin/(panel)/systems/_components/LooksRight.tsx
// "Looks right" on a system waiting for curation (D-057): the same save the
// editor makes when nothing changed (PATCH with the system's own order), which
// clears the flag (BR-1.8) and is logged like any save — without opening each
// editor. What visitors see stays exactly as it is.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { adminRequest } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

export function LooksRight({ systemId, sortOrder, className }: { systemId: string; sortOrder: number; className?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  return (
    <button
      type="button"
      disabled={state === "saving"}
      onClick={async () => {
        setState("saving");
        const res = await adminRequest(`/systems/${systemId}`, { method: "PATCH", body: { sortOrder } });
        if (!res.ok) return setState("error");
        router.refresh();
      }}
      title={state === "error" ? "That didn't go through. Open the system and save it there." : "Clears the curation flag; nothing visitors see changes"}
      className={cn(
        "inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors disabled:opacity-60",
        state === "error" ? "border-critical/30 text-critical" : "border-ink/15 text-ink hover:border-signal-finished/50 hover:text-signal-finished bg-sheet",
        className,
      )}
    >
      <Check aria-hidden="true" className="size-3.5" />
      {state === "saving" ? "Saving…" : state === "error" ? "Try in the editor" : "Looks right"}
    </button>
  );
}
