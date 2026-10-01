// app/(admin)/admin/(panel)/jobs/_components/RunNowButton.tsx
// Run a job now (#105) — the same runner and lock as the schedule.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { adminButton } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

export function RunNowButton({ job }: { job: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setNote(null);
    const res = await adminRequest(`/jobs/${job}/run`, { method: "POST" });
    setBusy(false);
    if (!res.ok) setNote(res.status === 500 ? "Failed — the reason is in the history." : res.message);
    router.refresh();
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={busy} className={cn(adminButton.secondary, "px-3 py-1.5")}>
        <Play aria-hidden="true" /> {busy ? "Running…" : "Run now"}
      </button>
      {note && <span role="status" className="max-w-48 text-right text-xs text-critical">{note}</span>}
    </span>
  );
}
