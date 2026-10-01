// app/(admin)/admin/(panel)/freshness/_components/FreshnessList.tsx
// Stale items with "Open" and "Still accurate" (#105, BR-1.16).

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { adminButton, Pill } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

interface Item {
  kind: "system" | "experience" | "education" | "profile";
  id: string;
  title: string;
  reviewedAt: string;
  daysSince: number;
}

const WHERE: Record<Item["kind"], (id: string) => string> = {
  system: (id) => `/admin/systems/${id}`,
  experience: () => "/admin/cv",
  education: () => "/admin/cv",
  profile: () => "/admin/profile",
};

export function FreshnessList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reviewed(item: Item) {
    setBusy(item.id);
    setError(null);
    const res = await adminRequest(`/freshness/${item.kind}/${item.id}/reviewed`, { method: "POST" });
    setBusy(null);
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  return (
    <>
      {error && <p className="mb-3 text-sm text-critical">{error}</p>}
      <ul className="divide-y divide-ink/10">
        {items.map((item) => (
          <li key={`${item.kind}:${item.id}`} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <Pill>{item.kind}</Pill>
                <span className="truncate text-sm font-medium text-ink">{item.title}</span>
              </span>
              <span className="mt-0.5 block text-xs text-slate">{item.daysSince} days since it was last edited or reviewed</span>
            </span>
            <span className="flex shrink-0 gap-2">
              <Link href={WHERE[item.kind](item.id)} className={cn(adminButton.secondary, "px-3 py-1.5")}>Open</Link>
              <button type="button" disabled={busy === item.id} onClick={() => reviewed(item)} className={cn(adminButton.dark, "px-3 py-1.5")}>
                <CheckCircle2 aria-hidden="true" /> {busy === item.id ? "Saving…" : "Still accurate"}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
