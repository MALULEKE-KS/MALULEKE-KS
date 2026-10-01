// app/(admin)/admin/(panel)/profile/_components/ProfileManager.tsx
// Profile, links and achievements (#105). The profile saves only what
// changed (PATCH); links and achievements act row by row. Database CHECK
// refusals come back as their own sentences (lib/rules/profile).

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Link2, Pencil, Plus, Save, X } from "lucide-react";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { adminButton, adminHint, adminInput, adminLabel, EmptyState, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { adminRequest, changedFields, fromLocalInput, toLocalInput } from "@/lib/admin/request";
import { cn } from "@/lib/utils";
import { TitlesPanel, type AdminTitle } from "./TitlesPanel";
import { PhotosPanel, type PhotoVersion } from "./PhotosPanel";

interface Profile {
  displayName: string;
  initials: string | null;
  headline: string | null;
  role: string;
  location: string | null;
  email: string;
  phone: string | null;
  summary: string | null;
  bio: string | null;
  availability: string | null;
  buildingSinceYear: number | null;
  links: Link[];
}
interface Link {
  id: string;
  kind: string;
  label: string;
  url: string;
  sortOrder: number;
  onCv: boolean;
}
interface Achievement {
  id: string;
  title: string;
  issuer: string | null;
  achievedOn: string;
  description: string | null;
  url: string | null;
  systemId: string | null;
  contentStatus: "draft" | "published" | "archived";
  publishAt: string | null;
  sortOrder: number;
}

const TEXT_FIELDS: { key: keyof Profile; label: string; hint?: string; required?: boolean; long?: number; max: number }[] = [
  { key: "displayName", label: "Name", required: true, max: 120 },
  { key: "initials", label: "Initials", hint: "The short mark used where the name doesn't fit.", max: 40 },
  { key: "headline", label: "Headline", hint: "Under your name on the CV and site.", max: 120 },
  { key: "role", label: "Role", required: true, max: 160 },
  { key: "location", label: "Location", max: 120 },
  { key: "email", label: "Public email", required: true, max: 254 },
  { key: "phone", label: "Phone", hint: "On the CV only when set.", max: 20 },
  { key: "availability", label: "Availability", hint: "e.g. what you're open to right now.", max: 200 },
  { key: "summary", label: "CV summary", hint: "Two to four lines at the top of the CV.", long: 4, max: 1200 },
  { key: "bio", label: "About page", hint: "Markdown. The story on /about.", long: 10, max: 4000 },
];

type ProfileForm = Record<string, string>;
function profileForm(p: Profile): ProfileForm {
  const out: ProfileForm = {};
  for (const f of TEXT_FIELDS) out[f.key] = (p[f.key] as string | null) ?? "";
  out.buildingSinceYear = p.buildingSinceYear === null ? "" : String(p.buildingSinceYear);
  return out;
}
function profileWire(f: ProfileForm) {
  const out: Record<string, string | number | null> = {};
  for (const field of TEXT_FIELDS) {
    const v = (f[field.key] ?? "").trim();
    out[field.key] = field.required ? v : v === "" ? null : v;
  }
  out.buildingSinceYear = f.buildingSinceYear?.trim() ? Number(f.buildingSinceYear) : null;
  return out;
}

export function ProfileManager({
  now,
  profile,
  achievements,
  systems,
  titles,
  titleKinds,
  education,
  photos,
  photoPurposes,
}: {
  now: number;
  profile: Profile;
  achievements: Achievement[];
  systems: { id: string; name: string }[];
  titles: AdminTitle[];
  titleKinds: { key: string; label: string }[];
  education: { id: string; label: string }[];
  photos: PhotoVersion[];
  photoPurposes: { key: string; label: string; description: string }[];
}) {
  return (
    <div className="space-y-6">
      <TitlesPanel initial={titles} kinds={titleKinds} education={education} />
      <PhotosPanel versions={photos} purposes={photoPurposes} />
      <ProfileForm profile={profile} />
      <div className="grid gap-6 xl:grid-cols-2">
        <LinksPanel initial={profile.links} />
        <AchievementsPanel now={now} initial={achievements} systems={systems} />
      </div>
    </div>
  );
}

function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const base = useMemo(() => profileForm(profile), [profile]);
  const [f, setF] = useState(base);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const patch = changedFields(profileWire(base), profileWire(f));
  const dirty = Object.keys(patch).length > 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setBusy(true);
    setMessage(null);
    const res = await adminRequest("/profile", { method: "PATCH", body: patch });
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: res.message });
    setMessage({ ok: true, text: "Saved — the site and CV show it now." });
    router.refresh();
  }

  return (
    <Panel title="Profile">
      <form onSubmit={save} noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          {TEXT_FIELDS.map((field) => (
            <div key={field.key} className={field.long ? "md:col-span-2" : undefined}>
              <label htmlFor={`p-${field.key}`} className={adminLabel}>
                {field.label}
                {!field.required && <span className="ml-1 font-normal text-slate">(optional)</span>}
              </label>
              {field.long ? (
                <textarea id={`p-${field.key}`} rows={field.long} maxLength={field.max} className={adminInput} value={f[field.key]} onChange={(e) => setF((p) => ({ ...p, [field.key]: e.target.value }))} />
              ) : (
                <input id={`p-${field.key}`} maxLength={field.max} className={adminInput} value={f[field.key]} onChange={(e) => setF((p) => ({ ...p, [field.key]: e.target.value }))} />
              )}
              {field.hint && <p className={adminHint}>{field.hint}</p>}
            </div>
          ))}
          <div>
            <label htmlFor="p-buildingSinceYear" className={adminLabel}>
              Building since <span className="font-normal text-slate">(optional)</span>
            </label>
            <input id="p-buildingSinceYear" inputMode="numeric" maxLength={4} className={adminInput} value={f.buildingSinceYear} onChange={(e) => setF((p) => ({ ...p, buildingSinceYear: e.target.value.replace(/\D/g, "") }))} />
            <p className={adminHint}>The year you started — the site counts years from it.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!dirty || busy} className={adminButton.primary}>
            <Save aria-hidden="true" /> {busy ? "Saving…" : "Save profile"}
          </button>
          {dirty && <button type="button" className={adminButton.ghost} onClick={() => setF(base)}>Discard</button>}
          {message && <p role="status" className={cn("text-sm", message.ok ? "text-signal-finished" : "text-critical")}>{message.text}</p>}
        </div>
      </form>
    </Panel>
  );
}

const EMPTY_LINK = { kind: "", label: "", url: "", sortOrder: 0, onCv: true };

function LinksPanel({ initial }: { initial: Link[] }) {
  const [links, setLinks] = useState(initial);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState(EMPTY_LINK);
  const [error, setError] = useState<string | null>(null);

  function start(link?: Link) {
    setError(null);
    setEditing(link ? link.id : "new");
    setDraft(link ? { kind: link.kind, label: link.label, url: link.url, sortOrder: link.sortOrder, onCv: link.onCv } : { ...EMPTY_LINK, sortOrder: links.length });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = editing === "new"
      ? await adminRequest<Link>("/profile/links", { method: "POST", body: draft })
      : await adminRequest<Link>(`/profile/links/${editing}`, { method: "PATCH", body: draft });
    if (!res.ok) return setError(res.message);
    setLinks((list) => [...list.filter((l) => l.id !== res.data.id), res.data].sort((a, b) => a.sortOrder - b.sortOrder));
    setEditing(null);
  }

  async function remove(id: string) {
    setError(null);
    const res = await adminRequest(`/profile/links/${id}`, { method: "DELETE" });
    if (!res.ok) return setError(res.message);
    setLinks((list) => list.filter((l) => l.id !== id));
  }

  return (
    <Panel
      title="Links"
      description="Contact and social links. The kind picks the icon (github, linkedin, email…)."
      actions={editing === null ? <button type="button" onClick={() => start()} className={adminButton.secondary}><Plus aria-hidden="true" /> Add link</button> : undefined}
    >
      {editing !== null && (
        <form onSubmit={save} className="mb-4 grid gap-3 rounded-xl border border-ink/10 bg-paper p-4 sm:grid-cols-2">
          <div>
            <label htmlFor="l-kind" className={adminLabel}>Kind</label>
            <input id="l-kind" className={cn(adminInput, "font-mono")} value={draft.kind} onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value.toLowerCase() }))} placeholder="github" />
          </div>
          <div>
            <label htmlFor="l-label" className={adminLabel}>Label</label>
            <input id="l-label" className={adminInput} maxLength={60} value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} placeholder="GitHub" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="l-url" className={adminLabel}>Address</label>
            <input id="l-url" className={adminInput} value={draft.url} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} placeholder="https:// or mailto:" />
          </div>
          <div>
            <label htmlFor="l-order" className={adminLabel}>Order</label>
            <input id="l-order" type="number" min={0} className={adminInput} value={draft.sortOrder} onChange={(e) => setDraft((d) => ({ ...d, sortOrder: Math.max(0, Math.trunc(Number(e.target.value)) || 0) }))} />
          </div>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-ink">
            <input type="checkbox" className="size-4 accent-ember" checked={draft.onCv} onChange={(e) => setDraft((d) => ({ ...d, onCv: e.target.checked }))} /> On the CV
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={adminButton.dark}>Save link</button>
            <button type="button" onClick={() => setEditing(null)} className={adminButton.ghost}>Cancel</button>
          </div>
        </form>
      )}
      {error && <p className="mb-3 text-sm text-critical">{error}</p>}
      {links.length === 0 ? (
        <EmptyState icon={Link2}>No links yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-ink/10">
          {links.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">
                  {l.label} <span className="font-mono text-xs font-normal text-slate">{l.kind}</span>
                </span>
                <span className="block truncate text-xs text-slate">{l.url}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {l.onCv && <Pill>CV</Pill>}
                <button type="button" onClick={() => start(l)} className="rounded-lg p-1.5 text-slate hover:bg-ink/5 hover:text-ink" aria-label={`Edit ${l.label}`}><Pencil aria-hidden="true" className="size-4" /></button>
                <ConfirmDelete label={l.label} onConfirm={() => remove(l.id)} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const EMPTY_ACHIEVEMENT = { title: "", issuer: "", achievedOn: "", description: "", url: "", systemId: "", contentStatus: "draft" as Achievement["contentStatus"], publishAt: "", sortOrder: 0 };

function AchievementsPanel({ now, initial, systems }: { now: number; initial: Achievement[]; systems: { id: string; name: string }[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState(EMPTY_ACHIEVEMENT);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) => setDraft((d) => ({ ...d, [k]: v }));

  function start(a?: Achievement) {
    setError(null);
    setEditing(a ? a.id : "new");
    setDraft(
      a
        ? { title: a.title, issuer: a.issuer ?? "", achievedOn: a.achievedOn, description: a.description ?? "", url: a.url ?? "", systemId: a.systemId ?? "", contentStatus: a.contentStatus, publishAt: toLocalInput(a.publishAt), sortOrder: a.sortOrder }
        : { ...EMPTY_ACHIEVEMENT, sortOrder: items.length },
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body = {
      title: draft.title.trim(),
      issuer: draft.issuer.trim() || null,
      achievedOn: draft.achievedOn,
      description: draft.description.trim() || null,
      url: draft.url.trim() || null,
      systemId: draft.systemId || null,
      contentStatus: draft.contentStatus,
      ...(draft.contentStatus === "published" ? { publishAt: fromLocalInput(draft.publishAt) } : {}),
      sortOrder: draft.sortOrder,
    };
    const res = editing === "new"
      ? await adminRequest<Achievement>("/achievements", { method: "POST", body })
      : await adminRequest<Achievement>(`/achievements/${editing}`, { method: "PATCH", body });
    if (!res.ok) return setError(res.message);
    setItems((list) => [...list.filter((a) => a.id !== res.data.id), res.data].sort((a, b) => a.sortOrder - b.sortOrder || b.achievedOn.localeCompare(a.achievedOn)));
    setEditing(null);
  }

  async function remove(id: string) {
    setError(null);
    const res = await adminRequest(`/achievements/${id}`, { method: "DELETE" });
    if (!res.ok) return setError(res.message);
    setItems((list) => list.filter((a) => a.id !== id));
  }

  return (
    <Panel
      title="Achievements"
      description="Certifications, awards, recognitions. Drafts until you publish them."
      actions={editing === null ? <button type="button" onClick={() => start()} className={adminButton.secondary}><Plus aria-hidden="true" /> Add</button> : undefined}
    >
      {editing !== null && (
        <form onSubmit={save} className="mb-4 grid gap-3 rounded-xl border border-ink/10 bg-paper p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="a-title" className={adminLabel}>Title</label>
            <input id="a-title" className={adminInput} maxLength={200} value={draft.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <label htmlFor="a-issuer" className={adminLabel}>Issuer</label>
            <input id="a-issuer" className={adminInput} maxLength={200} value={draft.issuer} onChange={(e) => set("issuer", e.target.value)} />
          </div>
          <div>
            <label htmlFor="a-date" className={adminLabel}>Date</label>
            <input id="a-date" type="date" className={adminInput} value={draft.achievedOn} onChange={(e) => set("achievedOn", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="a-desc" className={adminLabel}>Description</label>
            <textarea id="a-desc" rows={2} maxLength={1000} className={adminInput} value={draft.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <label htmlFor="a-url" className={adminLabel}>Credential link</label>
            <input id="a-url" className={adminInput} value={draft.url} onChange={(e) => set("url", e.target.value)} placeholder="https://" />
          </div>
          <div>
            <label htmlFor="a-system" className={adminLabel}>Earned through</label>
            <select id="a-system" className={adminInput} value={draft.systemId} onChange={(e) => set("systemId", e.target.value)}>
              <option value="">No system</option>
              {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="a-status" className={adminLabel}>Status</label>
            <select id="a-status" className={adminInput} value={draft.contentStatus} onChange={(e) => set("contentStatus", e.target.value as Achievement["contentStatus"])}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label htmlFor="a-publishAt" className={adminLabel}>Go live at</label>
            <input id="a-publishAt" type="datetime-local" disabled={draft.contentStatus !== "published"} className={adminInput} value={draft.publishAt} onChange={(e) => set("publishAt", e.target.value)} />
            <p className={adminHint}>Optional — empty means now (BR-1.13).</p>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={!draft.title.trim() || !draft.achievedOn} className={adminButton.dark}>Save achievement</button>
            <button type="button" onClick={() => setEditing(null)} className={adminButton.ghost}><X aria-hidden="true" /> Cancel</button>
          </div>
        </form>
      )}
      {error && <p className="mb-3 text-sm text-critical">{error}</p>}
      {items.length === 0 ? (
        <EmptyState icon={Award}>None yet. They stay off the site until you add and publish real ones.</EmptyState>
      ) : (
        <ul className="divide-y divide-ink/10">
          {items.map((a) => {
            const scheduled = a.contentStatus === "published" && a.publishAt && new Date(a.publishAt).getTime() > now;
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{a.title}</span>
                  <span className="block text-xs text-slate">{[a.issuer, a.achievedOn].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Pill tone={scheduled ? "attention" : a.contentStatus === "published" ? "good" : "neutral"}>{scheduled ? `from ${formatWhen(a.publishAt)}` : a.contentStatus}</Pill>
                  <button type="button" onClick={() => start(a)} className="rounded-lg p-1.5 text-slate hover:bg-ink/5 hover:text-ink" aria-label={`Edit ${a.title}`}><Pencil aria-hidden="true" className="size-4" /></button>
                  <ConfirmDelete label={a.title} onConfirm={() => remove(a.id)} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
