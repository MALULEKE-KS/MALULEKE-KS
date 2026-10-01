// app/(admin)/admin/(panel)/profile/_components/TitlesPanel.tsx
// Titles and qualifications (F5c, D13): several at once, in order, each of a
// kind (a lookup — add kinds in Settings). Give a title an end date to retire
// it while keeping it on record; it leaves the site on that date.

"use client";

import { useState } from "react";
import { BadgeCheck, Pencil, Plus } from "lucide-react";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { adminButton, adminHint, adminInput, adminLabel, EmptyState, Panel, Pill } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

export interface AdminTitle {
  id: string;
  kind: string;
  kindLabel: string;
  label: string;
  detail: string | null;
  educationId: string | null;
  sortOrder: number;
  startsOn: string | null;
  endsOn: string | null;
  current: boolean;
}

type Option = { key: string; label: string };

const EMPTY = { kind: "", label: "", detail: "", educationId: "", sortOrder: 0, startsOn: "", endsOn: "" };

export function TitlesPanel({ initial, kinds, education }: { initial: AdminTitle[]; kinds: Option[]; education: { id: string; label: string }[] }) {
  const [titles, setTitles] = useState(initial);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setDraft((d) => ({ ...d, [k]: v }));

  function start(t?: AdminTitle) {
    setError(null);
    setEditing(t ? t.id : "new");
    setDraft(
      t
        ? { kind: t.kind, label: t.label, detail: t.detail ?? "", educationId: t.educationId ?? "", sortOrder: t.sortOrder, startsOn: t.startsOn ?? "", endsOn: t.endsOn ?? "" }
        : { ...EMPTY, kind: kinds[0]?.key ?? "", sortOrder: titles.length },
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body = {
      kind: draft.kind,
      label: draft.label.trim(),
      detail: draft.detail.trim() || null,
      educationId: draft.educationId || null,
      sortOrder: draft.sortOrder,
      startsOn: draft.startsOn || null,
      endsOn: draft.endsOn || null,
    };
    const res =
      editing === "new"
        ? await adminRequest<AdminTitle>("/profile/titles", { method: "POST", body })
        : await adminRequest<AdminTitle>(`/profile/titles/${editing}`, { method: "PATCH", body });
    if (!res.ok) return setError(res.message);
    setTitles((list) => [...list.filter((t) => t.id !== res.data.id), res.data].sort((a, b) => a.sortOrder - b.sortOrder));
    setEditing(null);
  }

  async function remove(id: string) {
    setError(null);
    const res = await adminRequest(`/profile/titles/${id}`, { method: "DELETE" });
    if (!res.ok) return setError(res.message);
    setTitles((list) => list.filter((t) => t.id !== id));
  }

  return (
    <Panel
      title="Titles & qualifications"
      description="Shown together wherever your name is — the site header, hero, About and the CV. Add, reorder, or end one; nothing is in code."
      actions={editing === null ? <button type="button" onClick={() => start()} className={adminButton.secondary}><Plus aria-hidden="true" /> Add</button> : undefined}
    >
      {editing !== null && (
        <form onSubmit={save} className="mb-4 grid gap-3 rounded-xl border border-ink/10 bg-paper p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="t-label" className={adminLabel}>Title</label>
            <input id="t-label" maxLength={120} className={adminInput} value={draft.label} onChange={(e) => set("label", e.target.value)} placeholder="Software & AI Engineer" />
          </div>
          <div>
            <label htmlFor="t-kind" className={adminLabel}>Kind</label>
            <select id="t-kind" className={adminInput} value={draft.kind} onChange={(e) => set("kind", e.target.value)}>
              {kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="t-detail" className={adminLabel}>Where <span className="font-normal text-slate">(optional)</span></label>
            <input id="t-detail" maxLength={160} className={adminInput} value={draft.detail} onChange={(e) => set("detail", e.target.value)} placeholder="e.g. the institution" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="t-edu" className={adminLabel}>Education entry behind it <span className="font-normal text-slate">(optional)</span></label>
            <select id="t-edu" className={adminInput} value={draft.educationId} onChange={(e) => set("educationId", e.target.value)}>
              <option value="">None</option>
              {education.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="t-start" className={adminLabel}>From <span className="font-normal text-slate">(optional)</span></label>
            <input id="t-start" type="date" className={adminInput} value={draft.startsOn} onChange={(e) => set("startsOn", e.target.value)} />
          </div>
          <div>
            <label htmlFor="t-end" className={adminLabel}>Until <span className="font-normal text-slate">(optional)</span></label>
            <input id="t-end" type="date" className={adminInput} value={draft.endsOn} onChange={(e) => set("endsOn", e.target.value)} />
            <p className={adminHint}>After this date it leaves the site but stays on record.</p>
          </div>
          <div>
            <label htmlFor="t-order" className={adminLabel}>Order</label>
            <input id="t-order" type="number" min={0} className={adminInput} value={draft.sortOrder} onChange={(e) => set("sortOrder", Math.max(0, Math.trunc(Number(e.target.value)) || 0))} />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button type="submit" disabled={!draft.label.trim() || !draft.kind} className={adminButton.dark}>Save title</button>
            <button type="button" onClick={() => setEditing(null)} className={adminButton.ghost}>Cancel</button>
          </div>
        </form>
      )}
      {error && <p className="mb-3 text-sm text-critical">{error}</p>}
      {titles.length === 0 ? (
        <EmptyState icon={BadgeCheck}>No titles yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-ink/10">
          {titles.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="min-w-0">
                <span className={cn("block text-sm font-medium", t.current ? "text-ink" : "text-slate line-through")}>{t.label}</span>
                <span className="block text-xs text-slate">
                  {[t.kindLabel, t.detail, t.endsOn ? `until ${t.endsOn}` : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <Pill tone={t.current ? "good" : "neutral"}>{t.current ? "on the site" : "not current"}</Pill>
                <button type="button" onClick={() => start(t)} className="rounded-lg p-1.5 text-slate hover:bg-ink/5 hover:text-ink" aria-label={`Edit ${t.label}`}>
                  <Pencil aria-hidden="true" className="size-4" />
                </button>
                <ConfirmDelete label={t.label} onConfirm={() => remove(t.id)} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
