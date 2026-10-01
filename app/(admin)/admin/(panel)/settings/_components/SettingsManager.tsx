// app/(admin)/admin/(panel)/settings/_components/SettingsManager.tsx
// Four tabs (#105): Platform (each tunable with its rule, default and bounds
// checked on the server — #67), Lookups (every EXT-1 type with its own extra
// fields; add, relabel, deprecate — never delete, BR-8.2), Flags
// (toggled one at a time, no bulk control — BR-4.4) and Lenses.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Glasses, ListTree, Pencil, Plus, SlidersHorizontal } from "lucide-react";
import { adminButton, adminHint, adminInput, adminLabel, EmptyState, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

interface PlatformSetting {
  key: string;
  value: unknown;
  default: unknown;
  isDefault: boolean;
  description: string;
  rule: string;
  updatedAt: string | null;
}
interface FlagRow {
  id: string;
  key: string;
  enabled: boolean;
  notes: string | null;
}
interface Lens {
  id: string;
  key: string;
  label: string;
  priorityContent: Record<string, unknown>;
  aiFramingPrompt: string;
  sortOrder: number;
}
interface LookupValue {
  id: string;
  key: string;
  label: string;
  active: boolean;
  stage?: "shipped" | "building" | "queued";
  colorToken?: string;
  requiresOwnerPermission?: boolean;
  autoDraftOnShip?: boolean;
}

const LOOKUP_META: Record<string, { label: string; hint: string }> = {
  status: { label: "Statuses", hint: "A system's status; its stage decides which pipeline count it's in." },
  domain: { label: "Domains", hint: "What a system is about." },
  "inquiry-type": { label: "Inquiry types", hint: "The choices on the contact form." },
  "milestone-type": { label: "Milestone types", hint: "Journey entry kinds; one can be what a first ship is auto-drafted as." },
  "skill-category": { label: "Skill categories", hint: "How skills are grouped on the CV." },
  "repo-relationship": { label: "Repo relationships", hint: "Whose repo a system is; some require the owner's permission to publish (BR-1.11)." },
  "title-kind": { label: "Title kinds", hint: "What your titles are — a role, a qualification, …" },
  "organization-kind": { label: "Organisation kinds", hint: "Personal, venture, client, … — your own account and ventures are the GitHub homes." },
};
const STAGES = ["shipped", "building", "queued"] as const;
const COLOR_TOKENS = ["signal-finished", "signal-progress", "signal-planned"] as const;

type Tab = "platform" | "lookups" | "flags" | "lenses";

export function SettingsManager({ platform, flags, lenses, lookups }: { platform: PlatformSetting[]; flags: FlagRow[]; lenses: Lens[]; lookups: Record<string, LookupValue[]> }) {
  const [tab, setTab] = useState<Tab>("platform");
  const tabs: { key: Tab; label: string; Icon: typeof Flag }[] = [
    { key: "platform", label: "Platform", Icon: SlidersHorizontal },
    { key: "lookups", label: "Lookups", Icon: ListTree },
    { key: "flags", label: "Flags", Icon: Flag },
    { key: "lenses", label: "Lenses", Icon: Glasses },
  ];
  return (
    <div>
      <div role="tablist" aria-label="Settings sections" className="mb-5 flex flex-wrap gap-2">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              tab === key ? "border-ink bg-ink text-paper" : "border-ink/15 bg-sheet text-slate hover:border-ink/30 hover:text-ink",
            )}
          >
            <Icon aria-hidden="true" className="size-4" /> {label}
          </button>
        ))}
      </div>
      {tab === "platform" && <PlatformSection settings={platform} />}
      {tab === "lookups" && <LookupsSection lookups={lookups} />}
      {tab === "flags" && <FlagsSection flags={flags} />}
      {tab === "lenses" && <LensesSection lenses={lenses} />}
    </div>
  );
}

// ---------- platform ----------

function PlatformSection({ settings }: { settings: PlatformSetting[] }) {
  const groups = new Map<string, PlatformSetting[]>();
  for (const s of settings) {
    const group = s.key.split(".")[0]!;
    groups.set(group, [...(groups.get(group) ?? []), s]);
  }
  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([group, items]) => (
        <Panel key={group} title={group.charAt(0).toUpperCase() + group.slice(1)}>
          <ul className="divide-y divide-ink/10">
            {items.map((s) => <SettingRow key={`${s.key}:${String(s.value)}`} setting={s} />)}
          </ul>
        </Panel>
      ))}
    </div>
  );
}

function SettingRow({ setting }: { setting: PlatformSetting }) {
  const router = useRouter();
  const [value, setValue] = useState(String(setting.value));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = value !== String(setting.value);

  async function save(next: string) {
    setBusy(true);
    setError(null);
    const n = Number(next);
    const res = await adminRequest(`/settings/platform/${setting.key}`, { method: "PATCH", body: { value: Number.isFinite(n) && next.trim() !== "" ? n : next } });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  return (
    <li className="grid gap-3 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="text-sm text-ink">{setting.description}</p>
        <p className="mt-0.5 font-mono text-xs text-slate">
          {setting.key} · {setting.rule} · default {String(setting.default)}
          {!setting.isDefault && setting.updatedAt && ` · changed ${formatWhen(setting.updatedAt)}`}
        </p>
        {error && <p className="mt-1 text-xs text-critical">{error}</p>}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save(value);
        }}
      >
        <input aria-label={setting.description} inputMode={typeof setting.default === "number" ? "numeric" : "text"} className={cn(adminInput, "font-mono", typeof setting.default === "number" ? "w-24 text-right" : "w-64")} value={value} onChange={(e) => setValue(e.target.value)} />
        <button type="submit" disabled={!dirty || busy} className={cn(adminButton.dark, "px-3 py-1.5")}>Save</button>
        {String(setting.value) !== String(setting.default) && (
          <button type="button" disabled={busy} onClick={() => save(String(setting.default))} className={cn(adminButton.ghost, "px-2 py-1.5")} title="Back to the default">
            Reset
          </button>
        )}
      </form>
    </li>
  );
}

// ---------- lookups ----------

function LookupsSection({ lookups }: { lookups: Record<string, LookupValue[]> }) {
  const types = Object.keys(lookups);
  const [type, setType] = useState(types[0] ?? "status");
  const values = lookups[type] ?? [];
  const meta = LOOKUP_META[type] ?? { label: type, hint: "" };

  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <nav aria-label="Lookup types" className="flex flex-row flex-wrap gap-1 lg:flex-col">
        {types.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            aria-current={t === type ? "true" : undefined}
            className={cn("flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors", t === type ? "bg-ink text-paper" : "text-slate hover:bg-ink/5 hover:text-ink")}
          >
            {LOOKUP_META[t]?.label ?? t}
            <span className={cn("font-mono text-xs", t === type ? "text-mist" : "text-slate/70")}>{lookups[t]?.filter((v) => v.active).length ?? 0}</span>
          </button>
        ))}
      </nav>
      <Panel key={type} title={meta.label} description={`${meta.hint} Values are never deleted — deprecate one to hide it from new choices (BR-8.2).`}>
        <ul className="mb-5 divide-y divide-ink/10">
          {values.map((v) => <LookupRow key={`${v.id}:${v.label}:${v.active}:${v.stage}:${v.colorToken}:${v.requiresOwnerPermission}:${v.autoDraftOnShip}`} type={type} value={v} />)}
          {values.length === 0 && <li className="py-2 text-sm text-slate">No values yet.</li>}
        </ul>
        <NewLookup type={type} />
      </Panel>
    </div>
  );
}

function ExtrasFields({ type, extras, set }: { type: string; extras: Partial<LookupValue>; set: (patch: Partial<LookupValue>) => void }) {
  if (type === "status") {
    return (
      <>
        <div>
          <label className={adminLabel} htmlFor={`${type}-stage`}>Stage</label>
          <select id={`${type}-stage`} className={adminInput} value={extras.stage ?? "queued"} onChange={(e) => set({ stage: e.target.value as LookupValue["stage"] })}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={adminLabel} htmlFor={`${type}-color`}>Colour</label>
          <select id={`${type}-color`} className={adminInput} value={extras.colorToken ?? "signal-planned"} onChange={(e) => set({ colorToken: e.target.value })}>
            {COLOR_TOKENS.map((c) => <option key={c} value={c}>{c.replace("signal-", "")}</option>)}
          </select>
        </div>
      </>
    );
  }
  if (type === "repo-relationship") {
    return (
      <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-ink">
        <input type="checkbox" className="size-4 accent-ember" checked={extras.requiresOwnerPermission ?? false} onChange={(e) => set({ requiresOwnerPermission: e.target.checked })} />
        Needs the repo owner&apos;s permission
      </label>
    );
  }
  if (type === "milestone-type") {
    return (
      <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-ink">
        <input type="checkbox" className="size-4 accent-ember" checked={extras.autoDraftOnShip ?? false} onChange={(e) => set({ autoDraftOnShip: e.target.checked })} />
        Auto-draft first ships as this
      </label>
    );
  }
  return null;
}

function extrasFor(type: string, v: Partial<LookupValue>) {
  if (type === "status") return { stage: v.stage ?? "queued", colorToken: v.colorToken ?? "signal-planned" };
  if (type === "repo-relationship") return { requiresOwnerPermission: v.requiresOwnerPermission ?? false };
  if (type === "milestone-type") return { autoDraftOnShip: v.autoDraftOnShip ?? false };
  return {};
}

function LookupRow({ type, value }: { type: string; value: LookupValue }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<LookupValue>>(value);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await adminRequest(`/api/v1/lookups/${type}/${value.id}`, { method: "PATCH", body: { label: draft.label?.trim(), ...extrasFor(type, draft) } });
    if (!res.ok) return setError(res.message);
    setEditing(false);
    router.refresh();
  }

  async function deprecate() {
    setError(null);
    const res = await adminRequest(`/api/v1/lookups/${type}/${value.id}/deprecate`, { method: "POST" });
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  return (
    <li className="py-2.5 first:pt-0">
      {editing ? (
        <form onSubmit={save} className="grid gap-3 rounded-xl border border-ink/10 bg-paper p-3 sm:grid-cols-3">
          <div>
            <label className={adminLabel} htmlFor={`${value.id}-label`}>Label</label>
            <input id={`${value.id}-label`} className={adminInput} value={draft.label ?? ""} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
          </div>
          <ExtrasFields type={type} extras={draft} set={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" className={cn(adminButton.dark, "px-3 py-1.5")}>Save</button>
            <button type="button" onClick={() => { setEditing(false); setDraft(value); }} className={cn(adminButton.ghost, "px-3 py-1.5")}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className={cn("text-sm", value.active ? "text-ink" : "text-slate line-through")}>{value.label}</span>
            <span className="ml-2 font-mono text-xs text-slate">{value.key}</span>
            {value.stage && <span className="ml-2 text-xs text-slate">· {value.stage}</span>}
            {value.requiresOwnerPermission && <span className="ml-2 text-xs text-slate">· needs permission</span>}
            {value.autoDraftOnShip && <span className="ml-2 text-xs text-slate">· auto-draft</span>}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {!value.active && <Pill>deprecated</Pill>}
            <button type="button" onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-slate hover:bg-ink/5 hover:text-ink" aria-label={`Edit ${value.label}`}>
              <Pencil aria-hidden="true" className="size-4" />
            </button>
            {value.active && (
              <button type="button" onClick={deprecate} className="rounded-lg px-2 py-1 text-xs text-slate hover:bg-critical/10 hover:text-critical">Deprecate</button>
            )}
          </span>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-critical">{error}</p>}
    </li>
  );
}

function NewLookup({ type }: { type: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Partial<LookupValue>>({ key: "", label: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await adminRequest(`/api/v1/lookups/${type}`, { method: "POST", body: { key: draft.key?.trim(), label: draft.label?.trim(), ...extrasFor(type, draft) } });
    setSaving(false);
    if (!res.ok) return setError(res.message);
    setDraft({ key: "", label: "" });
    router.refresh();
  }

  return (
    <form onSubmit={add} className="grid gap-3 rounded-xl border border-dashed border-ink/15 p-4 sm:grid-cols-3">
      <div>
        <label className={adminLabel} htmlFor={`${type}-new-key`}>Key</label>
        <input id={`${type}-new-key`} className={cn(adminInput, "font-mono")} value={draft.key ?? ""} onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value.toLowerCase() }))} placeholder="lowercase_or-hyphen" />
        <p className={adminHint}>Fixed once created.</p>
      </div>
      <div>
        <label className={adminLabel} htmlFor={`${type}-new-label`}>Label</label>
        <input id={`${type}-new-label`} className={adminInput} value={draft.label ?? ""} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
      </div>
      <ExtrasFields type={type} extras={draft} set={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
      <div className="flex items-center gap-3 sm:col-span-3">
        <button type="submit" disabled={saving || !draft.key?.trim() || !draft.label?.trim()} className={adminButton.secondary}>
          <Plus aria-hidden="true" /> Add value
        </button>
        {error && <p className="text-sm text-critical">{error}</p>}
      </div>
    </form>
  );
}

// ---------- flags ----------

function FlagsSection({ flags }: { flags: FlagRow[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // BR-4.4 — strictly one at a time; there is deliberately no bulk control.
  async function toggle(key: string, enabled: boolean) {
    setPending(key);
    setError(null);
    const res = await adminRequest(`/settings/flags/${key}`, { method: "PATCH", body: { enabled } });
    setPending(null);
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  return (
    <Panel title="Feature flags" description="New capabilities ship switched off; each is turned on by itself (BR-4.4).">
      {error && <p className="mb-3 text-sm text-critical">{error}</p>}
      {flags.length === 0 ? (
        <EmptyState icon={Flag}>No flags.</EmptyState>
      ) : (
        <ul className="divide-y divide-ink/10">
          {flags.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <span className="min-w-0">
                <span className="block font-mono text-sm text-ink">{f.key}</span>
                {f.notes && <span className="mt-0.5 block text-xs text-slate">{f.notes}</span>}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={f.enabled}
                aria-label={f.key}
                disabled={pending === f.key}
                onClick={() => toggle(f.key, !f.enabled)}
                className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50", f.enabled ? "bg-ember" : "bg-ink/20")}
              >
                <span className={cn("absolute top-0.5 size-5 rounded-full bg-sheet shadow-soft transition-transform", f.enabled ? "translate-x-5" : "translate-x-0.5")} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ---------- lenses ----------

function LensesSection({ lenses }: { lenses: Lens[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const done = () => {
    setEditingId(null);
    router.refresh();
  };
  return (
    <Panel
      title="Visitor lenses"
      description="The chips visitors pick on the home page and in the AI guide, in this order. The label is public; the framing prompt tells the guide how to answer that visitor and stays private."
      actions={editingId === null ? <button type="button" onClick={() => setEditingId("new")} className={adminButton.secondary}><Plus aria-hidden="true" /> Add lens</button> : undefined}
    >
      {editingId === "new" && <div className="mb-4"><LensForm onDone={done} onCancel={() => setEditingId(null)} /></div>}
      {lenses.length === 0 && editingId !== "new" ? (
        <EmptyState icon={Glasses}>No lenses.</EmptyState>
      ) : (
        <ul className="divide-y divide-ink/10">
          {lenses.map((l) =>
            editingId === l.id ? (
              <li key={l.id} className="py-3"><LensForm lens={l} onDone={done} onCancel={() => setEditingId(null)} /></li>
            ) : (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span>
                  <span className="text-sm font-medium text-ink">{l.label}</span>
                  <span className="ml-2 font-mono text-xs text-slate">{l.key} · #{l.sortOrder}</span>
                </span>
                <button type="button" onClick={() => setEditingId(l.id)} className="rounded-lg p-1.5 text-slate hover:bg-ink/5 hover:text-ink" aria-label={`Edit ${l.label}`}>
                  <Pencil aria-hidden="true" className="size-4" />
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </Panel>
  );
}

function LensForm({ lens, onDone, onCancel }: { lens?: Lens; onDone: () => void; onCancel: () => void }) {
  const [key, setKey] = useState(lens?.key ?? "");
  const [label, setLabel] = useState(lens?.label ?? "");
  const [priorityContent, setPriorityContent] = useState(lens ? JSON.stringify(lens.priorityContent, null, 2) : "{}");
  const [prompt, setPrompt] = useState(lens?.aiFramingPrompt ?? "");
  const [sortOrder, setSortOrder] = useState(String(lens?.sortOrder ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(priorityContent);
    } catch {
      return setError("Priority content must be valid JSON.");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return setError("Priority content must be a JSON object.");
    setSaving(true);
    const res = await adminRequest(lens ? `/settings/lenses/${lens.id}` : "/settings/lenses", {
      method: lens ? "PATCH" : "POST",
      body: { key: key.trim(), label: label.trim(), priorityContent: parsed, aiFramingPrompt: prompt, sortOrder: Number(sortOrder) || 0 },
    });
    setSaving(false);
    if (!res.ok) return setError(res.message);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-ink/10 bg-paper p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_6rem]">
        <div><label htmlFor="lens-key" className={adminLabel}>Key</label><input id="lens-key" className={cn(adminInput, "font-mono")} value={key} onChange={(e) => setKey(e.target.value)} /></div>
        <div><label htmlFor="lens-label" className={adminLabel}>Label</label><input id="lens-label" className={adminInput} value={label} onChange={(e) => setLabel(e.target.value)} /></div>
        <div><label htmlFor="lens-order" className={adminLabel}>Order</label><input id="lens-order" inputMode="numeric" className={cn(adminInput, "font-mono")} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div>
      </div>
      <div><label htmlFor="lens-content" className={adminLabel}>Priority content (JSON)</label><textarea id="lens-content" rows={5} className={cn(adminInput, "font-mono text-xs")} value={priorityContent} onChange={(e) => setPriorityContent(e.target.value)} /></div>
      <div><label htmlFor="lens-prompt" className={adminLabel}>Framing prompt</label><textarea id="lens-prompt" rows={3} className={adminInput} value={prompt} onChange={(e) => setPrompt(e.target.value)} /></div>
      {error && <p className="text-sm text-critical">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving || !key.trim() || !label.trim() || !prompt.trim()} className={adminButton.dark}>{saving ? "Saving…" : "Save lens"}</button>
        <button type="button" onClick={onCancel} className={adminButton.ghost}>Cancel</button>
      </div>
    </form>
  );
}
