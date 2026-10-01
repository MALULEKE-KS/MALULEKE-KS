// app/(admin)/admin/(panel)/numbers/_components/NumbersManager.tsx
// Decide proposals, enter manual values, compute on demand, and define or
// edit metrics (#105). Every action goes through the metrics endpoints; the
// database enforces the proposal lifecycle (BR-5.3) and its refusals are
// shown as written.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Calculator, Check, Pencil, Plus, X } from "lucide-react";
import { adminButton, adminHint, adminInput, adminLabel, EmptyState, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

interface Snapshot {
  id: string;
  value: number;
  source: string;
  status: string;
  proposedAt: string;
  decidedAt: string | null;
}
interface Metric {
  key: string;
  label: string;
  description: string | null;
  unit: string | null;
  sortOrder: number;
  active: boolean;
  computed: boolean;
  current: Snapshot | null;
  pending: Snapshot | null;
  history: Snapshot[];
}

const fmt = (n: number) => n.toLocaleString("en-ZA", { maximumFractionDigits: 2 });

export function NumbersManager({ metrics }: { metrics: Metric[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [computing, setComputing] = useState(false);
  const [creating, setCreating] = useState(false);
  const pendingCount = metrics.filter((m) => m.pending).length;

  async function compute() {
    setComputing(true);
    setNotice(null);
    const res = await adminRequest<{ proposed: string[]; unchanged: string[] }>("/metrics/compute", { method: "POST" });
    setComputing(false);
    if (!res.ok) return setNotice({ ok: false, text: res.message });
    const { proposed, unchanged } = res.data;
    setNotice({ ok: true, text: proposed.length ? `${proposed.length} new value${proposed.length === 1 ? "" : "s"} to review.` : `Nothing changed (${unchanged.length} checked).` });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={compute} disabled={computing} className={adminButton.dark}>
          <Calculator aria-hidden="true" /> {computing ? "Computing…" : "Compute now"}
        </button>
        <button type="button" onClick={() => setCreating((c) => !c)} className={adminButton.secondary}>
          <Plus aria-hidden="true" /> New number
        </button>
        {pendingCount > 0 && <Pill tone="attention">{pendingCount} waiting on you</Pill>}
        {notice && <p role="status" className={cn("text-sm", notice.ok ? "text-signal-finished" : "text-critical")}>{notice.text}</p>}
      </div>

      {creating && <NewMetric onDone={() => { setCreating(false); router.refresh(); }} />}

      {metrics.length === 0 ? (
        <EmptyState icon={BarChart3}>No numbers defined yet.</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {metrics.map((m) => <MetricCard key={`${m.key}:${m.pending?.id ?? ""}:${m.current?.id ?? ""}`} metric={m} />)}
        </div>
      )}
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  async function act(path: string, body?: unknown) {
    setError(null);
    const res = await adminRequest(path, { method: "POST", body });
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  async function setActive(active: boolean) {
    setError(null);
    const res = await adminRequest(`/metrics/${metric.key}`, { method: "PATCH", body: { active } });
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  const unit = metric.unit ? ` ${metric.unit}` : "";

  return (
    <Panel
      title={metric.label}
      description={<span className="font-mono">{metric.key}</span>}
      actions={
        <span className="flex items-center gap-2">
          <Pill>{metric.computed ? "computed" : "manual"}</Pill>
          {!metric.active && <Pill tone="critical">hidden</Pill>}
          <button type="button" onClick={() => setEditing((e) => !e)} className="rounded-lg p-1.5 text-slate hover:bg-ink/5 hover:text-ink" aria-label={`Edit ${metric.label}`}>
            <Pencil aria-hidden="true" className="size-4" />
          </button>
        </span>
      }
      className={cn(!metric.active && "opacity-75")}
    >
      {editing ? (
        <EditMetric metric={metric} onDone={() => { setEditing(false); router.refresh(); }} />
      ) : (
        <>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-slate">Public</p>
              <p className="font-sans text-3xl font-semibold tracking-tight text-ink">{metric.current ? `${fmt(metric.current.value)}${unit}` : "—"}</p>
              {metric.current && <p className="text-xs text-slate">approved {formatWhen(metric.current.decidedAt)}</p>}
            </div>
            {metric.pending && (
              <div className="rounded-xl border border-ember/30 bg-ember/10 p-3 text-right">
                <p className="text-xs text-accent">Proposed ({metric.pending.source})</p>
                <p className="font-sans text-xl font-semibold text-ink">{fmt(metric.pending.value)}{unit}</p>
                <div className="mt-2 flex justify-end gap-1.5">
                  <button type="button" onClick={() => act(`/metrics/snapshots/${metric.pending!.id}/approve`)} className={cn(adminButton.primary, "px-3 py-1.5")}>
                    <Check aria-hidden="true" /> Approve
                  </button>
                  <button type="button" onClick={() => act(`/metrics/snapshots/${metric.pending!.id}/reject`)} className={cn(adminButton.ghost, "px-3 py-1.5")}>
                    <X aria-hidden="true" /> Reject
                  </button>
                </div>
              </div>
            )}
          </div>

          {!metric.computed && metric.active && (
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = Number(value);
                if (value.trim() === "" || !Number.isFinite(n)) return setError("Enter a number.");
                void act(`/metrics/${metric.key}/proposals`, { value: n }).then(() => setValue(""));
              }}
            >
              <input aria-label={`New value for ${metric.label}`} inputMode="decimal" className={cn(adminInput, "max-w-40")} value={value} onChange={(e) => setValue(e.target.value)} placeholder="New value" />
              <button type="submit" className={adminButton.secondary}>Propose</button>
            </form>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <button type="button" onClick={() => setShowHistory((s) => !s)} className="font-medium text-accent hover:underline">
              {showHistory ? "Hide history" : `History (${metric.history.length})`}
            </button>
            <button type="button" onClick={() => setActive(!metric.active)} className="text-slate hover:text-ink">
              {metric.active ? "Hide from the site" : "Show on the site"}
            </button>
          </div>
          {showHistory && (
            <ol className="mt-3 space-y-1 text-xs">
              {metric.history.map((s) => (
                <li key={s.id} className="flex justify-between gap-3 rounded-lg bg-paper px-3 py-1.5">
                  <span className="text-ink">{fmt(s.value)}{unit} <span className="text-slate">· {s.source}</span></span>
                  <span className="text-slate">{s.status} · {formatWhen(s.decidedAt ?? s.proposedAt)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
      {error && <p className="mt-3 text-sm text-critical">{error}</p>}
    </Panel>
  );
}

function MetricFields({ draft, set, withKey }: { draft: Record<string, string>; set: (k: string, v: string) => void; withKey?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {withKey && (
        <div className="sm:col-span-2">
          <label htmlFor="m-key" className={adminLabel}>Key</label>
          <input id="m-key" className={cn(adminInput, "font-mono")} value={draft.key} onChange={(e) => set("key", e.target.value)} placeholder="clients.served" />
          <p className={adminHint}>Dotted lowerCamel. Fixed once created. A key with a registered computation is computed; any other is entered by hand.</p>
        </div>
      )}
      <div>
        <label htmlFor="m-label" className={adminLabel}>Label</label>
        <input id="m-label" maxLength={120} className={adminInput} value={draft.label} onChange={(e) => set("label", e.target.value)} />
      </div>
      <div>
        <label htmlFor="m-unit" className={adminLabel}>Unit <span className="font-normal text-slate">(optional)</span></label>
        <input id="m-unit" maxLength={40} className={adminInput} value={draft.unit} onChange={(e) => set("unit", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="m-desc" className={adminLabel}>Description <span className="font-normal text-slate">(optional)</span></label>
        <input id="m-desc" maxLength={500} className={adminInput} value={draft.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div>
        <label htmlFor="m-order" className={adminLabel}>Order</label>
        <input id="m-order" inputMode="numeric" className={adminInput} value={draft.sortOrder} onChange={(e) => set("sortOrder", e.target.value.replace(/\D/g, ""))} />
      </div>
    </div>
  );
}

function wire(d: Record<string, string>) {
  return { label: d.label!.trim(), unit: d.unit!.trim() || null, description: d.description!.trim() || null, sortOrder: Number(d.sortOrder) || 0 };
}

function NewMetric({ onDone }: { onDone: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({ key: "", label: "", unit: "", description: "", sortOrder: "0" });
  const [error, setError] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminRequest("/metrics", { method: "POST", body: { key: draft.key!.trim(), ...wire(draft) } });
    if (!res.ok) return setError(res.message);
    onDone();
  }
  return (
    <Panel title="New number">
      <form onSubmit={save} className="space-y-4">
        <MetricFields draft={draft} set={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} withKey />
        <button type="submit" className={adminButton.dark}>Create</button>
        {error && <p className="text-sm text-critical">{error}</p>}
      </form>
    </Panel>
  );
}

function EditMetric({ metric, onDone }: { metric: Metric; onDone: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({ label: metric.label, unit: metric.unit ?? "", description: metric.description ?? "", sortOrder: String(metric.sortOrder) });
  const [error, setError] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminRequest(`/metrics/${metric.key}`, { method: "PATCH", body: wire(draft) });
    if (!res.ok) return setError(res.message);
    onDone();
  }
  return (
    <form onSubmit={save} className="space-y-4">
      <MetricFields draft={draft} set={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />
      <div className="flex gap-2">
        <button type="submit" className={adminButton.dark}>Save</button>
        <button type="button" onClick={onDone} className={adminButton.ghost}>Cancel</button>
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
    </form>
  );
}
