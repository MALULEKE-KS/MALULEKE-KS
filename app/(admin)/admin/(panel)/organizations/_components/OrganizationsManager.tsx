// app/(admin)/admin/(panel)/organizations/_components/OrganizationsManager.tsx
// List, add and edit organisations (#105). "Client" only sets the default
// visibility of systems created afterwards (BR-1.2) — never retroactive.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Pencil, Plus } from "lucide-react";
import { adminButton, adminHint, adminInput, adminLabel, EmptyState, Panel, Pill } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string | null;
  isClient: boolean;
  githubLogins: string[];
  kind: string | null;
  systemCount: number;
}

type Kind = { key: string; label: string };

export function OrganizationsManager({ organizations, kinds }: { organizations: Organization[]; kinds: Kind[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const done = () => {
    setEditingId(null);
    router.refresh();
  };

  return (
    <Panel
      actions={editingId === null ? <button type="button" onClick={() => setEditingId("new")} className={adminButton.secondary}><Plus aria-hidden="true" /> Add organisation</button> : undefined}
      title={`${organizations.length} organisation${organizations.length === 1 ? "" : "s"}`}
    >
      {editingId === "new" && <div className="mb-4"><OrganizationForm kinds={kinds} onDone={done} onCancel={() => setEditingId(null)} /></div>}
      {organizations.length === 0 && editingId !== "new" ? (
        <EmptyState icon={Building2}>No organisations yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-ink/10">
          {organizations.map((o) =>
            editingId === o.id ? (
              <li key={o.id} className="py-3"><OrganizationForm org={o} kinds={kinds} onDone={done} onCancel={() => setEditingId(null)} /></li>
            ) : (
              <li key={o.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{o.name}</span>
                    {o.role && <span className="text-xs text-slate">{o.role}</span>}
                    {o.kind && <Pill tone={o.kind === "client" ? "neutral" : "good"}>{kinds.find((k) => k.key === o.kind)?.label ?? o.kind}</Pill>}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate">
                    <span className="font-mono">{o.slug}</span> · {o.systemCount} system{o.systemCount === 1 ? "" : "s"}
                    {o.githubLogins.length > 0 && <> · GitHub: <span className="font-mono">{o.githubLogins.join(", ")}</span></>}
                  </span>
                </span>
                <button type="button" onClick={() => setEditingId(o.id)} className="self-start rounded-lg p-1.5 text-slate hover:bg-ink/5 hover:text-ink sm:self-auto" aria-label={`Edit ${o.name}`}>
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

function OrganizationForm({ org, kinds, onDone, onCancel }: { org?: Organization; kinds: Kind[]; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: org?.name ?? "",
    slug: org?.slug ?? "",
    role: org?.role ?? "",
    isClient: org?.isClient ?? false,
    githubLogins: org?.githubLogins.join(", ") ?? "",
    kind: org?.kind ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await adminRequest(org ? `/organizations/${org.id}` : "/organizations", {
      method: org ? "PATCH" : "POST",
      body: {
        name: f.name.trim(),
        slug: f.slug.trim(),
        role: f.role.trim() || null,
        isClient: f.isClient,
        githubLogins: f.githubLogins.split(",").map((l) => l.trim()).filter(Boolean),
        kind: f.kind || null,
      },
    });
    setSaving(false);
    if (!res.ok) return setError(res.message);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-ink/10 bg-paper p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="o-name" className={adminLabel}>Name</label><input id="o-name" maxLength={160} className={adminInput} value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} /></div>
        <div><label htmlFor="o-slug" className={adminLabel}>Slug</label><input id="o-slug" className={cn(adminInput, "font-mono")} value={f.slug} onChange={(e) => setF((p) => ({ ...p, slug: e.target.value.toLowerCase() }))} placeholder="lowercase-words" /></div>
        <div><label htmlFor="o-role" className={adminLabel}>Your role <span className="font-normal text-slate">(optional)</span></label><input id="o-role" maxLength={80} className={adminInput} value={f.role} onChange={(e) => setF((p) => ({ ...p, role: e.target.value }))} placeholder="Founder, Co-founder…" /></div>
        <div>
          <label htmlFor="o-gh" className={adminLabel}>GitHub logins</label>
          <input id="o-gh" className={cn(adminInput, "font-mono")} value={f.githubLogins} onChange={(e) => setF((p) => ({ ...p, githubLogins: e.target.value }))} placeholder="comma-separated" />
          <p className={adminHint}>Repos owned by these logins are filed here by the sync.</p>
        </div>
        <div>
          <label htmlFor="o-kind" className={adminLabel}>Kind</label>
          <select id="o-kind" className={adminInput} value={f.kind} onChange={(e) => setF((p) => ({ ...p, kind: e.target.value }))}>
            <option value="">Not set</option>
            {kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
          <p className={adminHint}>Your own account and ventures with GitHub logins are your GitHub homes on the site.</p>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-ink/10 bg-sheet p-3 sm:col-span-2">
          <input type="checkbox" className="mt-0.5 size-4 accent-ember" checked={f.isClient} onChange={(e) => setF((p) => ({ ...p, isClient: e.target.checked }))} />
          <span>
            <span className="block text-sm font-medium text-ink">A client</span>
            <span className="block text-xs text-slate">Systems created for it afterwards start as “requires approval” (BR-1.2). Existing systems don&apos;t change.</span>
          </span>
        </label>
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving || !f.name.trim() || !f.slug.trim()} className={adminButton.dark}>{saving ? "Saving…" : "Save organisation"}</button>
        <button type="button" onClick={onCancel} className={adminButton.ghost}>Cancel</button>
      </div>
    </form>
  );
}
