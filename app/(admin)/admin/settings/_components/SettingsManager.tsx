// app/(admin)/admin/settings/_components/SettingsManager.tsx
// Colocated — only used on /admin/settings. Three tabs: Flags (one-at-a-time
// toggle, no bulk-enable — BR-4.4), Lookups (add/soft-deprecate only, no
// hard-delete control anywhere in this UI — BR-8.2), Lenses.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LOOKUP_TYPES = ["status", "domain", "inquiry-type", "milestone-type", "skill-category"] as const;
type LookupType = (typeof LOOKUP_TYPES)[number];

const LOOKUP_LABELS: Record<LookupType, string> = {
  status: "Status",
  domain: "Domain",
  "inquiry-type": "Inquiry Type",
  "milestone-type": "Milestone Type",
  "skill-category": "Skill Category",
};

interface Flag {
  id: string;
  key: string;
  enabled: boolean;
  notes: string | null;
}

interface VisitorLens {
  id: string;
  key: string;
  label: string;
  priorityContent: Record<string, unknown>;
  aiFramingPrompt: string;
}

interface LookupValue {
  id: string;
  key: string;
  label: string;
  active: boolean;
}

interface SettingsManagerProps {
  flags: Flag[];
  lenses: VisitorLens[];
  lookups: Record<string, LookupValue[]>;
}

type Tab = "flags" | "lookups" | "lenses";

const inputClass =
  "w-full border-b border-slate/30 bg-transparent px-0 py-2 font-mono text-sm text-ink outline-none focus:border-accent";
const labelClass = "font-sans text-sm text-ink block mb-1";
const buttonClass =
  "font-sans text-xs font-medium bg-ink text-paper px-4 py-2 transition-colors hover:bg-ink/85 disabled:opacity-50";
const ghostButtonClass = "font-mono text-xs text-slate hover:text-accent transition-colors";

export function SettingsManager({ flags, lenses, lookups }: SettingsManagerProps) {
  const [tab, setTab] = useState<Tab>("flags");

  return (
    <div>
      <div className="flex gap-4 mb-8 border-b border-slate/20 font-mono text-xs">
        {(["flags", "lookups", "lenses"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`pb-2 uppercase tracking-wide ${
              tab === t ? "text-accent border-b-2 border-accent" : "text-slate hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "flags" && <FlagsSection flags={flags} />}
      {tab === "lookups" && <LookupsSection lookups={lookups} />}
      {tab === "lenses" && <LensesSection lenses={lenses} />}
    </div>
  );
}

// ============================================================
// FLAGS
// ============================================================

function FlagsSection({ flags }: { flags: Flag[] }) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // BR-4.4 — toggled strictly one at a time; there is deliberately no
  // "select all" or bulk-enable control anywhere in this section.
  async function handleToggle(key: string, enabled: boolean) {
    setPendingKey(key);
    try {
      await fetch(`/api/v1/admin/settings/flags/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      router.refresh();
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <ul className="divide-y divide-slate/10 border-t border-b border-slate/20">
      {flags.map((flag) => (
        <li key={flag.id} className="py-3 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-ink">{flag.key}</p>
            {flag.notes && <p className="font-sans text-xs text-slate mt-0.5">{flag.notes}</p>}
          </div>
          <label className="flex items-center gap-2 font-mono text-xs text-slate shrink-0">
            <input
              type="checkbox"
              checked={flag.enabled}
              disabled={pendingKey === flag.key}
              onChange={(e) => handleToggle(flag.key, e.target.checked)}
            />
            {flag.enabled ? "Enabled" : "Disabled"}
          </label>
        </li>
      ))}
    </ul>
  );
}

// ============================================================
// LOOKUPS
// ============================================================

function LookupsSection({ lookups }: { lookups: Record<string, LookupValue[]> }) {
  const router = useRouter();
  const [type, setType] = useState<LookupType>("status");
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const values = lookups[type] ?? [];

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/lookups/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, label }),
      });
      if (!res.ok) {
        setError("Something went wrong. Try again.");
        return;
      }
      setKey("");
      setLabel("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeprecate(id: string) {
    await fetch(`/api/v1/lookups/${type}/${id}/deprecate`, { method: "POST" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6 font-mono text-xs">
        {LOOKUP_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`px-2 py-1 border ${
              type === t ? "border-accent text-accent" : "border-slate/30 text-slate hover:border-slate"
            }`}
          >
            {LOOKUP_LABELS[t]}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-slate/10 border-t border-b border-slate/20 mb-6">
        {values.map((value) => (
          <li key={value.id} className="py-2.5 flex items-center justify-between gap-4">
            <div>
              <span className="font-sans text-sm text-ink">{value.label}</span>
              <span className="font-mono text-xs text-slate ml-2">{value.key}</span>
              {!value.active && <span className="font-mono text-xs text-slate ml-2">[deprecated]</span>}
            </div>
            {/* No hard-delete control anywhere in this UI — soft-deprecate
                only (BR-8.2), matching the API surface. */}
            {value.active && (
              <button type="button" className={ghostButtonClass} onClick={() => handleDeprecate(value.id)}>
                Deprecate
              </button>
            )}
          </li>
        ))}
        {values.length === 0 && <li className="py-3 font-sans text-sm text-slate">No values yet.</li>}
      </ul>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4 border border-slate/20 p-4">
        <div className="flex-1 min-w-[140px]">
          <label className={labelClass}>Key</label>
          <input
            className={inputClass}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="new_value"
            required
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className={labelClass}>Label</label>
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="New Value"
            required
          />
        </div>
        <button type="submit" disabled={saving} className={buttonClass}>
          {saving ? "Adding…" : "Add"}
        </button>
      </form>
      {error && <p className="font-sans text-sm text-critical mt-2">{error}</p>}
    </div>
  );
}

// ============================================================
// VISITOR LENSES
// ============================================================

function LensesSection({ lenses }: { lenses: VisitorLens[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-slate/10 border-t border-b border-slate/20">
        {lenses.map((lens) =>
          editingId === lens.id ? (
            <li key={lens.id} className="py-4">
              <LensForm
                lens={lens}
                onDone={() => {
                  setEditingId(null);
                  router.refresh();
                }}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={lens.id} className="py-3 flex items-start justify-between gap-4">
              <div>
                <p className="font-sans text-sm font-medium text-ink">{lens.label}</p>
                <p className="font-mono text-xs text-slate">{lens.key}</p>
              </div>
              <button type="button" className={ghostButtonClass} onClick={() => setEditingId(lens.id)}>
                Edit
              </button>
            </li>
          )
        )}
      </ul>

      {adding ? (
        <LensForm
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button type="button" className={ghostButtonClass} onClick={() => setAdding(true)}>
          + Add lens
        </button>
      )}
    </div>
  );
}

function LensForm({
  lens,
  onDone,
  onCancel,
}: {
  lens?: VisitorLens;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [key, setKey] = useState(lens?.key ?? "");
  const [label, setLabel] = useState(lens?.label ?? "");
  const [priorityContent, setPriorityContent] = useState(
    lens ? JSON.stringify(lens.priorityContent, null, 2) : "{}"
  );
  const [aiFramingPrompt, setAiFramingPrompt] = useState(lens?.aiFramingPrompt ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let parsedContent: Record<string, unknown>;
    try {
      parsedContent = JSON.parse(priorityContent);
    } catch {
      setError("Priority content must be valid JSON.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(lens ? `/api/v1/admin/settings/lenses/${lens.id}` : "/api/v1/admin/settings/lenses", {
        method: lens ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, label, priorityContent: parsedContent, aiFramingPrompt }),
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
          <label className={labelClass}>Key</label>
          <input className={inputClass} value={key} onChange={(e) => setKey(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Label</label>
          <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className={labelClass}>Priority content (JSON)</label>
        <textarea
          rows={4}
          className="w-full border border-slate/30 bg-transparent px-3 py-2 font-mono text-xs text-ink outline-none focus:border-accent"
          value={priorityContent}
          onChange={(e) => setPriorityContent(e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>AI framing prompt</label>
        <textarea
          rows={3}
          className="w-full border border-slate/30 bg-transparent px-3 py-2 font-sans text-sm text-ink outline-none focus:border-accent"
          value={aiFramingPrompt}
          onChange={(e) => setAiFramingPrompt(e.target.value)}
          required
        />
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
