// app/(admin)/admin/(panel)/systems/[id]/_components/SystemEditor.tsx
// The system editor (#105). One save for the record itself (PATCH, only the
// fields that changed); impacts, skills and case-study history act on their
// own endpoints. The publish gates are mirrored here as guidance — BR-1.1
// client approval, BR-1.11 repo-owner permission, BR-1.13 scheduling — and
// the server/database stay the real enforcement: whatever they refuse comes
// back as their own sentence.

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, History, Plus, RotateCcw, Save } from "lucide-react";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { adminButton, adminHint, adminInput, adminLabel, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { adminRequest, changedFields, fromLocalInput, toLocalInput } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

type ContentStatus = "draft" | "published" | "archived";
type Visibility = "PUBLIC" | "REQUIRES_APPROVAL" | "NDA_RESTRICTED" | "ANONYMIZED_ONLY";

interface EditorSystem {
  id: string;
  name: string;
  slug: string;
  description: string;
  techStack: string[];
  statusKey: string;
  domainKey: string | null;
  organizationId: string;
  clientVisibility: Visibility;
  contentStatus: ContentStatus;
  publishAt: string | null;
  clientApproved: boolean;
  nameDisclosureApproved: boolean;
  isFlagship: boolean;
  sortOrder: number;
  featuredOnHome: boolean;
  homeOrder: number;
  onCv: boolean;
  cvOrder: number;
  repoRelationship: string | null;
  ownerPermission: string;
  ownerPermissionFrom: string | null;
  ownerPermissionAt: string | null;
  ownerPermissionNote: string | null;
  caseStudyBody: string;
  repoUrl: string | null;
  liveUrl: string | null;
  screenshotUrl: string | null;
  repoPrivate: boolean;
  github: {
    fullName: string | null;
    ownerLogin: string | null;
    pushedAt: string | null;
    languages: Record<string, number> | null;
    topics: string[];
    stars: number | null;
    syncedAt: string | null;
  };
  impacts: { id: string; label: string; value: string; sortOrder: number }[];
  skillIds: string[];
}

interface Options {
  statuses: { key: string; label: string }[];
  domains: { key: string; label: string }[];
  organizations: { id: string; label: string }[];
  relationships: { key: string; label: string; requiresOwnerPermission: boolean }[];
  skills: { id: string; name: string }[];
}

interface HistoryData {
  statusChanges: { id: string; to: string; stage: string; backfilled: boolean; at: string }[];
  previousSlugs: { slug: string; at: string }[];
}

const VISIBILITY: { value: Visibility; label: string; hint: string }[] = [
  { value: "PUBLIC", label: "Public", hint: "Shown as is." },
  { value: "REQUIRES_APPROVAL", label: "Requires approval", hint: "Publishing needs the client's approval (BR-1.1)." },
  { value: "NDA_RESTRICTED", label: "NDA restricted", hint: "Publishing needs approval; details stay masked (BR-1.3)." },
  { value: "ANONYMIZED_ONLY", label: "Anonymised only", hint: "The organisation's name is hidden unless disclosure is approved (BR-1.4)." },
];

const PERMISSIONS = [
  { value: "not_requested", label: "Not asked yet" },
  { value: "requested", label: "Asked, waiting" },
  { value: "granted", label: "Granted" },
  { value: "declined", label: "Declined" },
];

function formFrom(s: EditorSystem) {
  return {
    name: s.name,
    slug: s.slug,
    description: s.description,
    techStack: s.techStack.join(", "),
    status: s.statusKey,
    domain: s.domainKey ?? "",
    organizationId: s.organizationId,
    clientVisibility: s.clientVisibility,
    contentStatus: s.contentStatus,
    publishAt: toLocalInput(s.publishAt),
    clientApproved: s.clientApproved,
    nameDisclosureApproved: s.nameDisclosureApproved,
    isFlagship: s.isFlagship,
    sortOrder: s.sortOrder,
    featuredOnHome: s.featuredOnHome,
    homeOrder: s.homeOrder,
    onCv: s.onCv,
    cvOrder: s.cvOrder,
    repoRelationship: s.repoRelationship ?? "",
    ownerPermission: s.ownerPermission,
    ownerPermissionFrom: s.ownerPermissionFrom ?? "",
    ownerPermissionNote: s.ownerPermissionNote ?? "",
    caseStudyBody: s.caseStudyBody,
    repoUrl: s.repoUrl ?? "",
    liveUrl: s.liveUrl ?? "",
    screenshotUrl: s.screenshotUrl ?? "",
  };
}
type Form = ReturnType<typeof formFrom>;

const blankToNull = (v: string) => (v.trim() === "" ? null : v.trim());

/** The form as the API's wire shape (SystemUpdateInputSchema). */
function toWire(f: Form, permissionApplies: boolean) {
  return {
    name: f.name.trim(),
    slug: f.slug.trim(),
    description: f.description.trim(),
    techStack: f.techStack.split(",").map((t) => t.trim()).filter(Boolean),
    status: f.status,
    domain: blankToNull(f.domain),
    organizationId: f.organizationId,
    clientVisibility: f.clientVisibility,
    contentStatus: f.contentStatus,
    // A publish time only exists while published (BR-1.13).
    ...(f.contentStatus === "published" ? { publishAt: fromLocalInput(f.publishAt) } : {}),
    clientApproved: f.clientApproved,
    nameDisclosureApproved: f.nameDisclosureApproved,
    isFlagship: f.isFlagship,
    sortOrder: f.sortOrder,
    featuredOnHome: f.featuredOnHome,
    homeOrder: f.homeOrder,
    onCv: f.onCv,
    cvOrder: f.cvOrder,
    repoRelationship: blankToNull(f.repoRelationship),
    ...(permissionApplies
      ? {
          ownerPermission: f.ownerPermission === "not_required" ? "not_requested" : f.ownerPermission,
          ownerPermissionFrom: blankToNull(f.ownerPermissionFrom),
          ownerPermissionNote: blankToNull(f.ownerPermissionNote),
        }
      : {}),
    caseStudyBody: f.caseStudyBody,
    repoUrl: blankToNull(f.repoUrl),
    liveUrl: blankToNull(f.liveUrl),
    screenshotUrl: blankToNull(f.screenshotUrl),
  };
}

function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex items-start gap-3 rounded-xl border border-ink/10 bg-paper p-3", disabled && "opacity-60")}>
      <input type="checkbox" className="mt-0.5 size-4 accent-ember" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-slate">{hint}</span>}
      </span>
    </label>
  );
}

export function SystemEditor({ now, system, options, history }: { now: number; system: EditorSystem; options: Options; history: HistoryData }) {
  const router = useRouter();
  const base = useMemo(() => formFrom(system), [system]);
  const [f, setF] = useState<Form>(base);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "critical"; text: string } | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setF((prev) => ({ ...prev, [key]: value }));

  const relationship = options.relationships.find((r) => r.key === f.repoRelationship);
  const permissionApplies = relationship?.requiresOwnerPermission ?? false;
  const approvalNeeded = f.clientVisibility !== "PUBLIC" && !f.clientApproved;
  const permissionMissing = permissionApplies && f.ownerPermission !== "granted";
  const publishBlocked = approvalNeeded || permissionMissing;
  const scheduledInFuture = f.contentStatus === "published" && f.publishAt !== "" && new Date(f.publishAt).getTime() > now;

  const patch = changedFields(toWire(base, permissionApplies), toWire(f, permissionApplies));
  const dirty = Object.keys(patch).length > 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    // Saving with no changes still marks a curation-flagged record as looked at (BR-1.8).
    const res = await adminRequest(`/systems/${system.id}`, { method: "PATCH", body: dirty ? patch : { sortOrder: f.sortOrder } });
    setSaving(false);
    if (!res.ok) {
      setMessage({ tone: "critical", text: res.message });
      return;
    }
    setMessage({ tone: "good", text: "Saved." });
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={save} className="min-w-0 space-y-6" noValidate>
        <Panel title="The system" description="Name, address, summary and what it's built with.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="name" className={adminLabel}>Name</label>
              <input id="name" className={adminInput} value={f.name} maxLength={120} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label htmlFor="slug" className={adminLabel}>Address</label>
              <input id="slug" className={cn(adminInput, "font-mono")} value={f.slug} maxLength={100} onChange={(e) => set("slug", e.target.value.toLowerCase())} />
              <p className={adminHint}>/systems/{f.slug || "…"} — renaming keeps the old address redirecting here (BR-1.14).</p>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="description" className={adminLabel}>Summary</label>
              <textarea id="description" rows={3} className={adminInput} value={f.description} maxLength={2000} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="techStack" className={adminLabel}>Built with</label>
              <input id="techStack" className={adminInput} value={f.techStack} onChange={(e) => set("techStack", e.target.value)} placeholder="Next.js, PostgreSQL, Prisma" />
              <p className={adminHint}>Comma-separated, up to 40.</p>
            </div>
            <div>
              <label htmlFor="status" className={adminLabel}>Status</label>
              <select id="status" className={adminInput} value={f.status} onChange={(e) => set("status", e.target.value)}>
                {options.statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="domain" className={adminLabel}>Domain</label>
              <select id="domain" className={adminInput} value={f.domain} onChange={(e) => set("domain", e.target.value)}>
                <option value="">None</option>
                {options.domains.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="organizationId" className={adminLabel}>Organisation</label>
              <select id="organizationId" className={adminInput} value={f.organizationId} onChange={(e) => set("organizationId", e.target.value)}>
                {options.organizations.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </Panel>

        <Panel title="Publishing" description="Who approved it, when it goes live, and who may see what.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="clientVisibility" className={adminLabel}>Client visibility</label>
              <select id="clientVisibility" className={adminInput} value={f.clientVisibility} onChange={(e) => set("clientVisibility", e.target.value as Visibility)}>
                {VISIBILITY.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
              <p className={adminHint}>{VISIBILITY.find((v) => v.value === f.clientVisibility)?.hint}</p>
            </div>
            <div>
              <label htmlFor="contentStatus" className={adminLabel}>Content status</label>
              <select id="contentStatus" className={adminInput} value={f.contentStatus} onChange={(e) => set("contentStatus", e.target.value as ContentStatus)}>
                <option value="draft">Draft</option>
                <option value="published" disabled={publishBlocked && base.contentStatus !== "published"}>
                  Published{publishBlocked ? " (blocked — see below)" : ""}
                </option>
                <option value="archived">Archived</option>
              </select>
              <p className={adminHint}>Systems are never deleted — archive to retire one (BR-1.9).</p>
            </div>
            <Toggle checked={f.clientApproved} onChange={(v) => set("clientApproved", v)} label="Client approved publishing" hint="Required before a non-public system can be published." />
            <Toggle checked={f.nameDisclosureApproved} onChange={(v) => set("nameDisclosureApproved", v)} label="Client approved naming them" hint="Separate from publishing approval (BR-1.4)." />
            <div className="md:col-span-2">
              <label htmlFor="publishAt" className={adminLabel}>
                <CalendarClock aria-hidden="true" className="mr-1.5 inline size-4 text-slate" />
                Go live at
              </label>
              <input
                id="publishAt"
                type="datetime-local"
                className={cn(adminInput, "max-w-xs")}
                value={f.publishAt}
                disabled={f.contentStatus !== "published"}
                onChange={(e) => set("publishAt", e.target.value)}
              />
              <p className={adminHint}>
                {f.contentStatus !== "published"
                  ? "Set the status to Published to schedule it (BR-1.13)."
                  : scheduledInFuture
                    ? "Scheduled — visitors see it from this time, with every publish check already passed."
                    : "Empty or past = live as soon as it's saved."}
              </p>
            </div>
          </div>
          {publishBlocked && (
            <ul className="mt-4 space-y-1 rounded-xl border border-critical/20 bg-critical/5 p-3 text-sm text-critical">
              {approvalNeeded && <li>Publishing needs the client&apos;s approval — tick “Client approved publishing” once you have it (BR-1.1).</li>}
              {permissionMissing && <li>This repo belongs to someone else — publishing needs their permission recorded as granted (BR-1.11).</li>}
            </ul>
          )}
        </Panel>

        <Panel title="Repo ownership" description="Whose repo it is, and the owner's answer when it's someone else's.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="repoRelationship" className={adminLabel}>Relationship</label>
              <select id="repoRelationship" className={adminInput} value={f.repoRelationship} onChange={(e) => set("repoRelationship", e.target.value)}>
                <option value="">Not set</option>
                {options.relationships.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            {permissionApplies && (
              <>
                <div>
                  <label htmlFor="ownerPermission" className={adminLabel}>Owner&apos;s permission</label>
                  <select id="ownerPermission" className={adminInput} value={f.ownerPermission === "not_required" ? "not_requested" : f.ownerPermission} onChange={(e) => set("ownerPermission", e.target.value)}>
                    {PERMISSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  {system.ownerPermissionAt && <p className={adminHint}>Last changed {formatWhen(system.ownerPermissionAt)}</p>}
                </div>
                <div>
                  <label htmlFor="ownerPermissionFrom" className={adminLabel}>Answer from</label>
                  <input id="ownerPermissionFrom" className={adminInput} value={f.ownerPermissionFrom} onChange={(e) => set("ownerPermissionFrom", e.target.value)} placeholder="Their name or GitHub login" />
                </div>
                <div>
                  <label htmlFor="ownerPermissionNote" className={adminLabel}>Note</label>
                  <input id="ownerPermissionNote" className={adminInput} value={f.ownerPermissionNote} onChange={(e) => set("ownerPermissionNote", e.target.value)} placeholder="Where and how they answered" />
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel title="Where it's shown" description="Order and placement across the site and the CV. Only published systems ever appear.">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-3">
              <Toggle checked={f.isFlagship} onChange={(v) => set("isFlagship", v)} label="Flagship" />
              <div>
                <label htmlFor="sortOrder" className={adminLabel}>Catalogue order</label>
                <input id="sortOrder" type="number" className={adminInput} value={f.sortOrder} onChange={(e) => set("sortOrder", Math.trunc(Number(e.target.value)) || 0)} />
              </div>
            </div>
            <div className="space-y-3">
              <Toggle checked={f.featuredOnHome} onChange={(v) => set("featuredOnHome", v)} label="On the home page" />
              <div>
                <label htmlFor="homeOrder" className={adminLabel}>Home order</label>
                <input id="homeOrder" type="number" min={0} className={adminInput} value={f.homeOrder} disabled={!f.featuredOnHome} onChange={(e) => set("homeOrder", Math.max(0, Math.trunc(Number(e.target.value)) || 0))} />
              </div>
            </div>
            <div className="space-y-3">
              <Toggle checked={f.onCv} onChange={(v) => set("onCv", v)} label="On the CV" />
              <div>
                <label htmlFor="cvOrder" className={adminLabel}>CV order</label>
                <input id="cvOrder" type="number" min={0} className={adminInput} value={f.cvOrder} disabled={!f.onCv} onChange={(e) => set("cvOrder", Math.max(0, Math.trunc(Number(e.target.value)) || 0))} />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Links">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="liveUrl" className={adminLabel}>Live site</label>
              <input id="liveUrl" type="url" className={adminInput} value={f.liveUrl} onChange={(e) => set("liveUrl", e.target.value)} placeholder="https://" />
            </div>
            <div>
              <label htmlFor="repoUrl" className={adminLabel}>Repository</label>
              <input id="repoUrl" type="url" className={adminInput} value={f.repoUrl} onChange={(e) => set("repoUrl", e.target.value)} placeholder="https://github.com/…" />
              {system.repoPrivate && <p className={adminHint}>Private repo — shown as private, never linked (BR-1.7).</p>}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="screenshotUrl" className={adminLabel}>Screenshot</label>
              <input id="screenshotUrl" type="url" className={adminInput} value={f.screenshotUrl} onChange={(e) => set("screenshotUrl", e.target.value)} placeholder="https://…/screenshot.png" />
              <p className={adminHint}>Left empty, the case study shows a drawn placeholder instead.</p>
            </div>
          </div>
        </Panel>

        <Panel title="Case study" description="Markdown. Every saved version is kept — see History.">
          <label htmlFor="caseStudyBody" className="sr-only">Case study</label>
          <textarea id="caseStudyBody" rows={16} className={cn(adminInput, "font-mono text-[0.8125rem] leading-relaxed")} value={f.caseStudyBody} onChange={(e) => set("caseStudyBody", e.target.value)} />
        </Panel>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-sheet/95 p-3 shadow-lift backdrop-blur">
          <button type="submit" disabled={saving} className={adminButton.primary}>
            <Save aria-hidden="true" /> {saving ? "Saving…" : dirty ? "Save changes" : "Save"}
          </button>
          {dirty && (
            <button type="button" className={adminButton.ghost} onClick={() => { setF(base); setMessage(null); }}>
              Discard changes
            </button>
          )}
          <p role="status" aria-live="polite" className={cn("text-sm", message?.tone === "critical" ? "text-critical" : "text-signal-finished")}>
            {message?.text ?? (dirty ? `${Object.keys(patch).length} unsaved change${Object.keys(patch).length === 1 ? "" : "s"}` : "")}
          </p>
        </div>
      </form>

      <aside className="min-w-0 space-y-6">
        <ImpactsPanel systemId={system.id} initial={system.impacts} />
        <SkillsPanel systemId={system.id} skills={options.skills} initial={system.skillIds} />
        <RevisionsPanel systemId={system.id} />
        <FactsPanel system={system} history={history} />
      </aside>
    </div>
  );
}

function ImpactsPanel({ systemId, initial }: { systemId: string; initial: EditorSystem["impacts"] }) {
  const [impacts, setImpacts] = useState(initial);
  const [draft, setDraft] = useState({ label: "", value: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const sortOrder = impacts.length === 0 ? 0 : Math.max(...impacts.map((i) => i.sortOrder)) + 1;
    const res = await adminRequest<EditorSystem["impacts"][number]>(`/systems/${systemId}/impacts`, { method: "POST", body: { ...draft, sortOrder } });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setImpacts((list) => [...list, res.data]);
    setDraft({ label: "", value: "" });
  }

  async function remove(id: string) {
    setError(null);
    const res = await adminRequest(`/impacts/${id}`, { method: "DELETE" });
    if (!res.ok) return setError(res.message);
    setImpacts((list) => list.filter((i) => i.id !== id));
  }

  return (
    <Panel title="Impact" description="Measured outcomes, on the case study and the CV.">
      {impacts.length > 0 && (
        <ul className="mb-4 space-y-2">
          {impacts.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2">
              <span className="min-w-0 text-sm">
                <span className="font-semibold text-ink">{i.value}</span> <span className="text-slate">{i.label}</span>
              </span>
              <ConfirmDelete label={i.label} onConfirm={() => remove(i.id)} />
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
        <input aria-label="Value" className={adminInput} value={draft.value} maxLength={60} placeholder="58" onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))} />
        <input aria-label="What it measures" className={adminInput} value={draft.label} maxLength={120} placeholder="Audit findings closed" onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
        <button type="submit" disabled={busy || !draft.label.trim() || !draft.value.trim()} className={cn(adminButton.secondary, "col-span-2")}>
          <Plus aria-hidden="true" /> Add impact
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-critical">{error}</p>}
    </Panel>
  );
}

function SkillsPanel({ systemId, skills, initial }: { systemId: string; skills: Options["skills"]; initial: string[] }) {
  const [selected, setSelected] = useState(new Set(initial));
  const [saved, setSaved] = useState(new Set(initial));
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const dirty = selected.size !== saved.size || [...selected].some((id) => !saved.has(id));
  const shown = skills.filter((s) => s.name.toLowerCase().includes(filter.trim().toLowerCase()));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setStatus(null);
    const res = await adminRequest(`/systems/${systemId}/skills`, { method: "PUT", body: { skillIds: [...selected] } });
    if (!res.ok) return setStatus(res.message);
    setSaved(new Set(selected));
    setStatus("Saved.");
  }

  return (
    <Panel title="Skills it proves" description={`${selected.size} selected — evidence once published.`}>
      {skills.length === 0 ? (
        <p className="text-sm text-slate">Add skills on the CV page first.</p>
      ) : (
        <>
          <input aria-label="Filter skills" className={cn(adminInput, "mb-3")} placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
            {shown.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={selected.has(s.id)}
                onClick={() => toggle(s.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  selected.has(s.id) ? "border-ink bg-ink text-paper" : "border-ink/15 bg-paper text-slate hover:border-ink/30 hover:text-ink",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" onClick={save} disabled={!dirty} className={adminButton.secondary}>Save skills</button>
            {status && <span className={cn("text-xs", status === "Saved." ? "text-signal-finished" : "text-critical")}>{status}</span>}
          </div>
        </>
      )}
    </Panel>
  );
}

interface Revision {
  id: string;
  body: string | null;
  actorType: string;
  backfilled: boolean;
  createdAt: string;
  current: boolean;
}

function RevisionsPanel({ systemId }: { systemId: string }) {
  const router = useRouter();
  const [field, setField] = useState<"caseStudyBody" | "description">("caseStudyBody");
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(which: typeof field) {
    setField(which);
    setError(null);
    const res = await adminRequest<{ revisions: Revision[] }>(`/systems/${systemId}/revisions?field=${which}`);
    if (!res.ok) return setError(res.message);
    setRevisions(res.data.revisions);
  }

  async function restore(id: string) {
    setError(null);
    const res = await adminRequest(`/systems/${systemId}/revisions/${id}/restore`, { method: "POST" });
    if (!res.ok) return setError(res.message);
    await load(field);
    router.refresh();
  }

  return (
    <Panel title="History" description="Every version of the case study and summary (BR-1.15).">
      <div className="mb-3 flex gap-2">
        {(["caseStudyBody", "description"] as const).map((which) => (
          <button key={which} type="button" onClick={() => load(which)} className={cn(adminButton.ghost, "px-3 py-1.5", revisions && field === which && "bg-ink/5 text-ink")}>
            <History aria-hidden="true" /> {which === "caseStudyBody" ? "Case study" : "Summary"}
          </button>
        ))}
      </div>
      {error && <p className="mb-2 text-xs text-critical">{error}</p>}
      {revisions && (revisions.length === 0 ? (
        <p className="text-sm text-slate">No versions recorded yet.</p>
      ) : (
        <ol className="max-h-80 space-y-2 overflow-y-auto">
          {revisions.map((r) => (
            <li key={r.id} className="rounded-xl bg-paper p-3">
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="text-left text-xs text-ink hover:text-accent">
                  {formatWhen(r.createdAt)} · {r.backfilled ? "when history began" : r.actorType.toLowerCase()}
                </button>
                {r.current ? (
                  <Pill tone="good">current</Pill>
                ) : (
                  <button type="button" onClick={() => restore(r.id)} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                    <RotateCcw aria-hidden="true" className="size-3.5" /> Restore
                  </button>
                )}
              </div>
              {open === r.id && <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[0.75rem] text-slate">{r.body ?? "(empty)"}</pre>}
            </li>
          ))}
        </ol>
      ))}
    </Panel>
  );
}

function FactsPanel({ system, history }: { system: EditorSystem; history: HistoryData }) {
  const g = system.github;
  const languages = g.languages ? Object.entries(g.languages).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name) : [];
  return (
    <Panel title="Facts" description="Sourced, not typed — refreshed by the GitHub sync.">
      <dl className="space-y-2 text-sm">
        {g.fullName ? (
          <>
            <div className="flex justify-between gap-3"><dt className="text-slate">Repository</dt><dd className="truncate font-mono text-xs text-ink">{g.fullName}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate">Last push</dt><dd className="text-ink">{formatWhen(g.pushedAt)}</dd></div>
            {languages.length > 0 && <div className="flex justify-between gap-3"><dt className="text-slate">Languages</dt><dd className="text-right text-ink">{languages.join(", ")}</dd></div>}
            {g.stars !== null && <div className="flex justify-between gap-3"><dt className="text-slate">Stars</dt><dd className="text-ink">{g.stars}</dd></div>}
            <div className="flex justify-between gap-3"><dt className="text-slate">Synced</dt><dd className="text-ink">{formatWhen(g.syncedAt)}</dd></div>
          </>
        ) : (
          <p className="text-slate">Not linked to a GitHub repository.</p>
        )}
      </dl>
      {history.previousSlugs.length > 0 && (
        <div className="mt-4 border-t border-ink/10 pt-4">
          <p className="mb-2 text-xs font-medium text-slate">Old addresses (redirect here)</p>
          <ul className="space-y-1">
            {history.previousSlugs.map((s) => <li key={s.slug} className="font-mono text-xs text-ink">/systems/{s.slug}</li>)}
          </ul>
        </div>
      )}
      {history.statusChanges.length > 0 && (
        <div className="mt-4 border-t border-ink/10 pt-4">
          <p className="mb-2 text-xs font-medium text-slate">Status history</p>
          <ol className="space-y-1.5">
            {history.statusChanges.map((c) => (
              <li key={c.id} className="flex justify-between gap-3 text-xs">
                <span className="text-ink">{c.to} <span className="text-slate">({c.stage})</span></span>
                <span className="shrink-0 text-slate">{c.backfilled ? "at start" : formatWhen(c.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Panel>
  );
}
