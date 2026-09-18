// app/(admin)/admin/inquiries/_components/InquiriesTriage.tsx
// Colocated — only used on /admin/inquiries. List + detail panel, both
// driven by client state (selection) since the list itself is server-
// filtered via URL search params (see page.tsx). Transition buttons only
// ever render the valid next step(s) for the selected inquiry's current
// status (BR-2.1) — the server re-checks the same rule regardless, but the
// UI never even offers an invalid option.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RuleCitation } from "@/components/shared/RuleCitation";

type ApiInquiryStatus = "new" | "reviewed" | "responded" | "closed";

interface InquiryRow {
  id: string;
  status: ApiInquiryStatus;
  name: string;
  email: string;
  message: string;
  inquiryTypeLabel: string;
  submittedAt: string;
}

const STATUS_LABEL: Record<ApiInquiryStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  responded: "Responded",
  closed: "Closed",
};

const STATUS_COLOR_CLASS: Record<ApiInquiryStatus, string> = {
  new: "text-accent border-accent",
  reviewed: "text-signal-progress border-signal-progress",
  responded: "text-signal-finished border-signal-finished",
  closed: "text-slate border-slate/40",
};

const NEXT_STEPS: Record<ApiInquiryStatus, { status: Exclude<ApiInquiryStatus, "new">; label: string }[]> = {
  new: [{ status: "reviewed", label: "Mark reviewed" }],
  reviewed: [
    { status: "responded", label: "Mark responded" },
    { status: "closed", label: "Close" },
  ],
  responded: [{ status: "closed", label: "Close" }],
  closed: [],
};

function formatAge(submittedAt: string): string {
  const ms = Date.now() - new Date(submittedAt).getTime();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function InquiriesTriage({ inquiries }: { inquiries: InquiryRow[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Falls back to the first row whenever the explicitly selected id is
  // missing — either nothing's been clicked yet, or the previously
  // selected inquiry just transitioned out of the active filter (e.g.
  // marking a "New" item reviewed while viewing the "New" filter).
  const selected = inquiries.find((i) => i.id === selectedId) ?? inquiries[0] ?? null;

  async function transition(status: ApiInquiryStatus) {
    if (!selected) return;
    setTransitioning(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/inquiries/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "Could not update status.");
        return;
      }
      router.refresh();
    } finally {
      setTransitioning(false);
    }
  }

  if (inquiries.length === 0) {
    return <p className="font-sans text-slate">No new inquiries.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-8">
      <ul className="divide-y divide-slate/10 border-t border-b border-slate/20">
        {inquiries.map((inquiry) => (
          <li key={inquiry.id}>
            <button
              type="button"
              onClick={() => setSelectedId(inquiry.id)}
              className={`w-full text-left px-3 py-3 hover:bg-slate/5 ${
                selected?.id === inquiry.id ? "bg-slate/5" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-sans text-sm font-medium text-ink">{inquiry.name}</span>
                <span
                  className={`font-mono text-xs px-1.5 py-0.5 border shrink-0 ${STATUS_COLOR_CLASS[inquiry.status]}`}
                >
                  {STATUS_LABEL[inquiry.status]}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="font-mono text-xs text-slate">{inquiry.inquiryTypeLabel}</span>
                <span className="font-mono text-xs text-slate">{formatAge(inquiry.submittedAt)}</span>
              </div>
              <p className="font-sans text-xs text-slate mt-1 line-clamp-2">{inquiry.message}</p>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="border border-slate/20 p-6 h-fit">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-sans font-semibold text-lg text-ink">{selected.name}</h2>
            <span
              className={`font-mono text-xs px-1.5 py-0.5 border shrink-0 ${STATUS_COLOR_CLASS[selected.status]}`}
            >
              {STATUS_LABEL[selected.status]}
            </span>
          </div>
          <p className="font-mono text-xs text-slate mb-1">{selected.email}</p>
          <p className="font-mono text-xs text-slate mb-4">{selected.inquiryTypeLabel}</p>
          <p className="font-sans text-sm text-ink whitespace-pre-wrap mb-6">{selected.message}</p>

          {error && <p className="font-sans text-sm text-critical mb-4">{error}</p>}

          <div className="flex items-center gap-3">
            {NEXT_STEPS[selected.status].map((step) => (
              <button
                key={step.status}
                type="button"
                disabled={transitioning}
                onClick={() => transition(step.status)}
                className="font-sans text-sm font-medium bg-ink text-paper px-4 py-2 transition-colors hover:bg-ink/85 disabled:opacity-50"
              >
                {step.label}
              </button>
            ))}
            {NEXT_STEPS[selected.status].length === 0 && (
              <p className="font-mono text-xs text-slate">Resolved — no further action.</p>
            )}
          </div>

          <p className="font-mono text-xs text-slate mt-6">
            Sequential transitions enforced server-side — <RuleCitation rule="BR-2.1" />
          </p>
        </div>
      )}
    </div>
  );
}
