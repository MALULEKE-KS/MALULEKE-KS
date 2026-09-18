// app/(admin)/admin/timeline/_components/TimelineManager.tsx
// Colocated — only used on /admin/timeline. List + add/edit form, hard
// delete (no publishing-state history to preserve, unlike System).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TimelineEntry {
  id: string;
  milestoneType: string;
  title: string;
  description: string | null;
  date: string;
  tags: string[];
}

interface MilestoneType {
  id: string;
  key: string;
  label: string;
}

const inputClass =
  "w-full border-b border-slate/30 bg-transparent px-0 py-2 font-mono text-sm text-ink outline-none focus:border-accent";
const labelClass = "font-sans text-sm text-ink block mb-1";
const buttonClass =
  "font-sans text-xs font-medium bg-ink text-paper px-4 py-2 transition-colors hover:bg-ink/85 disabled:opacity-50";
const ghostButtonClass = "font-mono text-xs text-slate hover:text-accent transition-colors";

export function TimelineManager({
  entries,
  milestoneTypes,
}: {
  entries: TimelineEntry[];
  milestoneTypes: MilestoneType[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function handleDelete(id: string) {
    await fetch(`/api/v1/admin/timeline/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-slate/10 border-t border-b border-slate/20">
        {entries.map((entry) =>
          editingId === entry.id ? (
            <li key={entry.id} className="py-4">
              <TimelineForm
                entry={entry}
                milestoneTypes={milestoneTypes}
                onDone={() => {
                  setEditingId(null);
                  router.refresh();
                }}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={entry.id} className="py-3 flex items-start justify-between gap-4">
              <div>
                <p className="font-sans text-sm font-medium text-ink">{entry.title}</p>
                <p className="font-mono text-xs text-slate">
                  {milestoneTypes.find((t) => t.key === entry.milestoneType)?.label ?? entry.milestoneType} ·{" "}
                  {entry.date}
                </p>
                {entry.tags.length > 0 && <p className="font-mono text-xs text-slate mt-1">{entry.tags.join(", ")}</p>}
              </div>
              <div className="flex gap-3 shrink-0">
                <button type="button" className={ghostButtonClass} onClick={() => setEditingId(entry.id)}>
                  Edit
                </button>
                <button type="button" className={ghostButtonClass} onClick={() => handleDelete(entry.id)}>
                  Delete
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      {adding ? (
        <TimelineForm
          milestoneTypes={milestoneTypes}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button type="button" className={ghostButtonClass} onClick={() => setAdding(true)}>
          + Add entry
        </button>
      )}
    </div>
  );
}

function TimelineForm({
  entry,
  milestoneTypes,
  onDone,
  onCancel,
}: {
  entry?: TimelineEntry;
  milestoneTypes: MilestoneType[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [milestoneTypeId, setMilestoneTypeId] = useState(
    milestoneTypes.find((t) => t.key === entry?.milestoneType)?.id ?? milestoneTypes[0]?.id ?? ""
  );
  const [title, setTitle] = useState(entry?.title ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [date, setDate] = useState(entry?.date ?? "");
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(entry ? `/api/v1/admin/timeline/${entry.id}` : "/api/v1/admin/timeline", {
        method: entry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneTypeId,
          title,
          description: description || null,
          date,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) {
        setError("Something went wrong. Try again.");
        return;
      }
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-slate/20 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Milestone type</label>
          <select
            className={inputClass}
            value={milestoneTypeId}
            onChange={(e) => setMilestoneTypeId(e.target.value)}
            required
          >
            {milestoneTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className={labelClass}>Title</label>
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div>
        <label className={labelClass}>Description (optional)</label>
        <textarea
          rows={2}
          className="w-full border border-slate/30 bg-transparent px-3 py-2 font-sans text-sm text-ink outline-none focus:border-accent"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>Tags (comma-separated)</label>
        <input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>

      {error && <p className="font-sans text-sm text-critical">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className={buttonClass}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className={ghostButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
