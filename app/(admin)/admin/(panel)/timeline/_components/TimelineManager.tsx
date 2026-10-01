// app/(admin)/admin/(panel)/timeline/_components/TimelineManager.tsx
// Journey entries (#105): drafts waiting for approval first — the sync
// auto-drafts them when a system ships (#70) — then everything else, newest
// first. Add, edit, publish now or schedule (BR-1.13), and remove (entries
// have no publishing history to keep, unlike systems).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Pencil, Plus } from "lucide-react";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { adminButton, adminHint, adminInput, adminLabel, EmptyState, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { adminRequest, fromLocalInput, toLocalInput } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

type ContentStatus = "draft" | "published" | "archived";

interface TimelineEntry {
  id: string;
  milestoneType: string;
  title: string;
  description: string | null;
  date: string;
  tags: string[];
  contentStatus: ContentStatus;
  autoDrafted: boolean;
  systemId: string | null;
  publishAt: string | null;
}

interface MilestoneType {
  id: string;
  key: string;
  label: string;
}

function statusPill(entry: TimelineEntry, now: number) {
  const scheduled = entry.contentStatus === "published" && entry.publishAt && new Date(entry.publishAt).getTime() > now;
  if (scheduled) return <Pill tone="attention">from {formatWhen(entry.publishAt)}</Pill>;
  return <Pill tone={entry.contentStatus === "published" ? "good" : entry.contentStatus === "draft" ? "attention" : "neutral"}>{entry.contentStatus}</Pill>;
}

export function TimelineManager({ now, entries, milestoneTypes }: { now: number; entries: TimelineEntry[]; milestoneTypes: MilestoneType[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const drafts = entries.filter((e) => e.contentStatus === "draft");
  const rest = entries.filter((e) => e.contentStatus !== "draft");
  const typeLabel = (key: string) => milestoneTypes.find((t) => t.key === key)?.label ?? key;

  async function remove(id: string) {
    setError(null);
    const res = await adminRequest(`/timeline/${id}`, { method: "DELETE" });
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  async function approve(id: string) {
    setError(null);
    const entry = entries.find((e) => e.id === id)!;
    const res = await adminRequest(`/timeline/${id}`, { method: "PATCH", body: { ...wireFrom(entry, milestoneTypes), contentStatus: "published" } });
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  const done = () => {
    setEditingId(null);
    router.refresh();
  };

  const row = (entry: TimelineEntry) =>
    editingId === entry.id ? (
      <li key={entry.id} className="py-3">
        <TimelineForm entry={entry} milestoneTypes={milestoneTypes} onDone={done} onCancel={() => setEditingId(null)} />
      </li>
    ) : (
      <li key={entry.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{entry.title}</p>
          <p className="mt-0.5 text-xs text-slate">
            {typeLabel(entry.milestoneType)} · {entry.date}
            {entry.autoDrafted && " · drafted by the sync"}
          </p>
          {entry.description && <p className="mt-1 line-clamp-2 text-sm text-slate">{entry.description}</p>}
          {entry.tags.length > 0 && (
            <p className="mt-1.5 flex flex-wrap gap-1">
              {entry.tags.map((t) => <span key={t} className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs text-slate">{t}</span>)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {statusPill(entry, now)}
          {entry.contentStatus === "draft" && (
            <button type="button" onClick={() => approve(entry.id)} className={cn(adminButton.primary, "px-3 py-1.5")}>
              <Check aria-hidden="true" /> Publish
            </button>
          )}
          <button type="button" onClick={() => setEditingId(entry.id)} className="rounded-lg p-1.5 text-slate hover:bg-ink/5 hover:text-ink" aria-label={`Edit ${entry.title}`}>
            <Pencil aria-hidden="true" className="size-4" />
          </button>
          <ConfirmDelete label={entry.title} onConfirm={() => remove(entry.id)} />
        </div>
      </li>
    );

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-critical">{error}</p>}
      {editingId === "new" ? (
        <Panel title="New entry">
          <TimelineForm milestoneTypes={milestoneTypes} onDone={done} onCancel={() => setEditingId(null)} />
        </Panel>
      ) : (
        <button type="button" onClick={() => setEditingId("new")} className={adminButton.dark}>
          <Plus aria-hidden="true" /> Add entry
        </button>
      )}

      {drafts.length > 0 && (
        <Panel title={`Waiting for approval (${drafts.length})`} description="Only published entries appear on /journey — and only while their system is published (BR-1.12).">
          <ul className="divide-y divide-ink/10">{drafts.map(row)}</ul>
        </Panel>
      )}

      <Panel title="Journey">
        {rest.length === 0 ? <EmptyState icon={BookOpen}>No entries yet.</EmptyState> : <ul className="divide-y divide-ink/10">{rest.map(row)}</ul>}
      </Panel>
    </div>
  );
}

function wireFrom(entry: TimelineEntry, types: MilestoneType[]) {
  return {
    milestoneTypeId: types.find((t) => t.key === entry.milestoneType)?.id ?? types[0]?.id ?? "",
    title: entry.title,
    description: entry.description,
    date: entry.date,
    tags: entry.tags,
  };
}

function TimelineForm({ entry, milestoneTypes, onDone, onCancel }: { entry?: TimelineEntry; milestoneTypes: MilestoneType[]; onDone: () => void; onCancel: () => void }) {
  const [milestoneTypeId, setMilestoneTypeId] = useState(milestoneTypes.find((t) => t.key === entry?.milestoneType)?.id ?? milestoneTypes[0]?.id ?? "");
  const [title, setTitle] = useState(entry?.title ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [date, setDate] = useState(entry?.date ?? "");
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const [contentStatus, setContentStatus] = useState<ContentStatus>(entry?.contentStatus ?? "published");
  const [publishAt, setPublishAt] = useState(toLocalInput(entry?.publishAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await adminRequest(entry ? `/timeline/${entry.id}` : "/timeline", {
      method: entry ? "PATCH" : "POST",
      body: {
        milestoneTypeId,
        title: title.trim(),
        description: description.trim() || null,
        date,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        contentStatus,
        ...(contentStatus === "published" ? { publishAt: fromLocalInput(publishAt) } : {}),
      },
    });
    setSaving(false);
    if (!res.ok) return setError(res.message);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-ink/10 bg-paper p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="t-type" className={adminLabel}>Milestone type</label>
          <select id="t-type" className={adminInput} value={milestoneTypeId} onChange={(e) => setMilestoneTypeId(e.target.value)}>
            {milestoneTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="t-date" className={adminLabel}>Date</label>
          <input id="t-date" type="date" className={adminInput} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="t-title" className={adminLabel}>Title</label>
          <input id="t-title" className={adminInput} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="t-desc" className={adminLabel}>Description <span className="font-normal text-slate">(optional)</span></label>
          <textarea id="t-desc" rows={3} className={adminInput} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="t-tags" className={adminLabel}>Tags</label>
          <input id="t-tags" className={adminInput} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Comma-separated" />
        </div>
        <div>
          <label htmlFor="t-status" className={adminLabel}>Status</label>
          <select id="t-status" className={adminInput} value={contentStatus} onChange={(e) => setContentStatus(e.target.value as ContentStatus)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label htmlFor="t-publishAt" className={adminLabel}>Go live at</label>
          <input id="t-publishAt" type="datetime-local" className={adminInput} disabled={contentStatus !== "published"} value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
          <p className={adminHint}>Optional — empty means now (BR-1.13).</p>
        </div>
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving || !title.trim() || !date || !milestoneTypeId} className={adminButton.dark}>{saving ? "Saving…" : "Save entry"}</button>
        <button type="button" onClick={onCancel} className={adminButton.ghost}>Cancel</button>
      </div>
    </form>
  );
}
