// app/(admin)/admin/(panel)/inquiries/_components/InquiriesTriage.tsx
// List + detail (#105). The list is server-filtered via the URL (page.tsx);
// selection is client state. Transition buttons only ever render the valid
// next step(s) for the selected inquiry (BR-2.1) — the server re-checks the
// same rule, but the UI never offers an invalid option.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Inbox, Mail } from "lucide-react";
import { RuleCitation } from "@/components/shared/RuleCitation";
import { adminButton, EmptyState, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

type ApiInquiryStatus = "new" | "reviewed" | "responded" | "closed";

interface InquiryRow {
  id: string;
  status: ApiInquiryStatus;
  name: string;
  email: string;
  message: string;
  source: string | null;
  inquiryTypeLabel: string;
  submittedAt: string;
  reviewDueAt: string;
  overdue: boolean;
  anonymized: boolean;
}

const TONE: Record<ApiInquiryStatus, "attention" | "neutral" | "good"> = { new: "attention", reviewed: "neutral", responded: "good", closed: "neutral" };

const NEXT_STEPS: Record<ApiInquiryStatus, { status: Exclude<ApiInquiryStatus, "new">; label: string }[]> = {
  new: [{ status: "reviewed", label: "Mark reviewed" }],
  reviewed: [
    { status: "responded", label: "Mark responded" },
    { status: "closed", label: "Close" },
  ],
  responded: [{ status: "closed", label: "Close" }],
  closed: [],
};

function formatAge(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function InquiriesTriage({ inquiries }: { inquiries: InquiryRow[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Falls back to the first row when the selected one has left the current
  // filter (e.g. marking a "New" item reviewed while viewing "New").
  const selected = inquiries.find((i) => i.id === selectedId) ?? inquiries[0] ?? null;

  async function transition(status: ApiInquiryStatus) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const res = await adminRequest(`/inquiries/${selected.id}`, { method: "PATCH", body: { status } });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  if (inquiries.length === 0) {
    return (
      <Panel>
        <EmptyState icon={Inbox}>Nothing here.</EmptyState>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <Panel className="h-fit">
        <ul className="-m-5 divide-y divide-ink/[0.06]">
          {inquiries.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => setSelectedId(i.id)}
                aria-current={selected?.id === i.id ? "true" : undefined}
                className={cn("w-full px-5 py-3.5 text-left transition-colors hover:bg-paper", selected?.id === i.id && "bg-paper shadow-[inset_3px_0_0_var(--color-ember,#FF5B1F)]")}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{i.anonymized ? "Anonymised" : i.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {i.overdue && <Pill tone="critical">overdue</Pill>}
                    <Pill tone={TONE[i.status]}>{i.status}</Pill>
                  </span>
                </span>
                <span className="mt-1 flex items-center justify-between gap-2 text-xs text-slate">
                  <span>{i.inquiryTypeLabel}</span>
                  <span>{formatAge(i.submittedAt)}</span>
                </span>
                <span className="mt-1 line-clamp-2 block text-xs text-slate">{i.message}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      {selected && (
        <Panel className="h-fit lg:sticky lg:top-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ink">{selected.anonymized ? "Anonymised inquiry" : selected.name}</h2>
              {!selected.anonymized && <p className="break-all text-sm text-slate">{selected.email}</p>}
            </div>
            <Pill tone={TONE[selected.status]}>{selected.status}</Pill>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-paper p-3 text-xs">
            <div><dt className="text-slate">About</dt><dd className="mt-0.5 text-ink">{selected.inquiryTypeLabel}</dd></div>
            <div><dt className="text-slate">Came from</dt><dd className="mt-0.5 truncate text-ink">{selected.source ?? "—"}</dd></div>
            <div><dt className="text-slate">Sent</dt><dd className="mt-0.5 text-ink">{formatWhen(selected.submittedAt)}</dd></div>
            <div>
              <dt className="text-slate">Review due</dt>
              <dd className={cn("mt-0.5 inline-flex items-center gap-1", selected.overdue ? "text-critical" : "text-ink")}>
                {selected.status === "new" ? <><Clock aria-hidden="true" className="size-3.5" />{formatWhen(selected.reviewDueAt)}</> : "Reviewed"}
              </dd>
            </div>
          </dl>

          <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-ink">{selected.message}</p>

          {error && <p className="mt-4 text-sm text-critical">{error}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {NEXT_STEPS[selected.status].map((step, n) => (
              <button key={step.status} type="button" disabled={busy} onClick={() => transition(step.status)} className={n === 0 ? adminButton.dark : adminButton.secondary}>
                {step.label}
              </button>
            ))}
            {!selected.anonymized && selected.status !== "closed" && (
              <a href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.inquiryTypeLabel}`)}`} className={adminButton.ghost}>
                <Mail aria-hidden="true" /> Reply by email
              </a>
            )}
            {NEXT_STEPS[selected.status].length === 0 && <p className="text-xs text-slate">Resolved — no further action.</p>}
          </div>

          <p className="mt-6 text-xs text-slate">
            Steps go in order, checked on the server — <RuleCitation rule="BR-2.1" />
          </p>
        </Panel>
      )}
    </div>
  );
}
