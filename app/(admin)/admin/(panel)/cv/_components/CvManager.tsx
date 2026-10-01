// app/(admin)/admin/(panel)/cv/_components/CvManager.tsx
// Roles, education and skills — what the generated CV is built from (#105).
// Each form sends the entry's whole shape: the API treats omitted lists
// (highlights, coursework, skills) as empty, so a partial body would wipe
// them. Every entry can be a draft, published now or scheduled (BR-1.13).
// Deleting an in-use skill is refused by the database; the reason is shown.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, GraduationCap, Pencil, Plus, Wrench } from "lucide-react";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { adminButton, adminHint, adminInput, adminLabel, EmptyState, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { adminRequest, fromLocalInput, toLocalInput } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

type ContentStatus = "draft" | "published" | "archived";

interface ExperienceEntry {
  id: string;
  title: string;
  organization: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  description: string;
  highlights: string[];
  contentStatus: ContentStatus;
  publishAt: string | null;
  skills: string[];
}

interface EducationEntry {
  id: string;
  institution: string;
  qualification: string;
  fieldOfStudy: string | null;
  startDate: string;
  endDate: string | null;
  honors: string | null;
  description: string | null;
  certificateUrl: string | null;
  contentStatus: ContentStatus;
  publishAt: string | null;
  skills: string[];
  expectedGraduation: string | null;
  coursework: string[];
}

interface SkillEntry {
  id: string;
  name: string;
  category: string;
  yearsExperience: number | null;
}

type SkillOption = { id: string; name: string };

interface CvManagerProps {
  /** Request time from the server — "scheduled" is decided against it. */
  now: number;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillEntry[];
  categories: { id: string; label: string }[];
  allSkillsForPicker: SkillOption[];
}

type Tab = "experience" | "education" | "skills";

const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

function StatusPill({ status, publishAt, now }: { status: ContentStatus; publishAt: string | null; now: number }) {
  if (status === "published" && publishAt && new Date(publishAt).getTime() > now) return <Pill tone="attention">from {formatWhen(publishAt)}</Pill>;
  return <Pill tone={status === "published" ? "good" : status === "draft" ? "attention" : "neutral"}>{status}</Pill>;
}

export function CvManager({ now, experience, education, skills, categories, allSkillsForPicker }: CvManagerProps) {
  const [tab, setTab] = useState<Tab>("experience");
  const tabs: { key: Tab; label: string; count: number; Icon: typeof Briefcase }[] = [
    { key: "experience", label: "Roles", count: experience.length, Icon: Briefcase },
    { key: "education", label: "Education", count: education.length, Icon: GraduationCap },
    { key: "skills", label: "Skills", count: skills.length, Icon: Wrench },
  ];

  return (
    <div>
      <div role="tablist" aria-label="CV sections" className="mb-5 flex flex-wrap gap-2">
        {tabs.map(({ key, label, count, Icon }) => (
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
            <span className={cn("font-mono text-xs", tab === key ? "text-mist" : "text-slate/70")}>{count}</span>
          </button>
        ))}
      </div>

      {tab === "experience" && <ExperienceSection now={now} entries={experience} allSkills={allSkillsForPicker} />}
      {tab === "education" && <EducationSection now={now} entries={education} allSkills={allSkillsForPicker} />}
      {tab === "skills" && <SkillsSection entries={skills} categories={categories} />}
    </div>
  );
}

// ---------- shared pieces ----------

function SkillPicker({ allSkills, selected, onToggle }: { allSkills: SkillOption[]; selected: Set<string>; onToggle: (id: string) => void }) {
  if (allSkills.length === 0) return <p className={adminHint}>Add skills in the Skills tab to link them here.</p>;
  return (
    <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
      {allSkills.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={selected.has(s.id)}
          onClick={() => onToggle(s.id)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs transition-colors",
            selected.has(s.id) ? "border-ink bg-ink text-paper" : "border-ink/15 bg-sheet text-slate hover:border-ink/30 hover:text-ink",
          )}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}

function useSkillSet(allSkills: SkillOption[], names: string[] | undefined) {
  const [selected, setSelected] = useState(() => new Set(allSkills.filter((s) => names?.includes(s.name)).map((s) => s.id)));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return [selected, toggle] as const;
}

function PublishFields({ idPrefix, status, publishAt, onStatus, onPublishAt }: { idPrefix: string; status: ContentStatus; publishAt: string; onStatus: (s: ContentStatus) => void; onPublishAt: (v: string) => void }) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-status`} className={adminLabel}>Status</label>
        <select id={`${idPrefix}-status`} className={adminInput} value={status} onChange={(e) => onStatus(e.target.value as ContentStatus)}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-publishAt`} className={adminLabel}>Go live at</label>
        <input id={`${idPrefix}-publishAt`} type="datetime-local" className={adminInput} disabled={status !== "published"} value={publishAt} onChange={(e) => onPublishAt(e.target.value)} />
        <p className={adminHint}>Optional — empty means now (BR-1.13).</p>
      </div>
    </>
  );
}

function FormActions({ saving, disabled, label, onCancel, error }: { saving: boolean; disabled?: boolean; label: string; onCancel: () => void; error: string | null }) {
  return (
    <>
      {error && <p className="text-sm text-critical">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving || disabled} className={adminButton.dark}>{saving ? "Saving…" : label}</button>
        <button type="button" onClick={onCancel} className={adminButton.ghost}>Cancel</button>
      </div>
    </>
  );
}

function useCrud(basePath: string) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function remove(id: string) {
    setError(null);
    const res = await adminRequest(`${basePath}/${id}`, { method: "DELETE" });
    if (!res.ok) return setError(res.message);
    router.refresh();
  }
  const done = () => {
    setEditingId(null);
    router.refresh();
  };
  return { editingId, setEditingId, error, remove, done };
}

function RowActions({ label, onEdit, onRemove }: { label: string; onEdit: () => void; onRemove: () => Promise<void> }) {
  return (
    <>
      <button type="button" onClick={onEdit} className="rounded-lg p-1.5 text-slate hover:bg-ink/5 hover:text-ink" aria-label={`Edit ${label}`}>
        <Pencil aria-hidden="true" className="size-4" />
      </button>
      <ConfirmDelete label={label} onConfirm={onRemove} />
    </>
  );
}

// ---------- roles ----------

function ExperienceSection({ now, entries, allSkills }: { now: number; entries: ExperienceEntry[]; allSkills: SkillOption[] }) {
  const { editingId, setEditingId, error, remove, done } = useCrud("/cv/experience");
  return (
    <Panel
      title="Roles"
      description="Newest first. Only published roles appear on /cv and the generated CV."
      actions={editingId === null ? <button type="button" onClick={() => setEditingId("new")} className={adminButton.secondary}><Plus aria-hidden="true" /> Add role</button> : undefined}
    >
      {error && <p className="mb-3 text-sm text-critical">{error}</p>}
      {editingId === "new" && <div className="mb-4"><ExperienceForm allSkills={allSkills} onDone={done} onCancel={() => setEditingId(null)} /></div>}
      {entries.length === 0 && editingId !== "new" ? (
        <EmptyState icon={Briefcase}>No roles yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-ink/10">
          {entries.map((e) =>
            editingId === e.id ? (
              <li key={e.id} className="py-3"><ExperienceForm entry={e} allSkills={allSkills} onDone={done} onCancel={() => setEditingId(null)} /></li>
            ) : (
              <li key={e.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{e.title}</p>
                  <p className="text-xs text-slate">{[e.organization, e.location].filter(Boolean).join(" · ")} · {e.startDate} – {e.endDate ?? "present"}</p>
                  {e.highlights.length > 0 && <p className="mt-1 text-xs text-slate">{e.highlights.length} highlight{e.highlights.length === 1 ? "" : "s"}</p>}
                  {e.skills.length > 0 && <p className="mt-1 text-xs text-slate">{e.skills.join(", ")}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <StatusPill status={e.contentStatus} publishAt={e.publishAt} now={now} />
                  <RowActions label={e.title} onEdit={() => setEditingId(e.id)} onRemove={() => remove(e.id)} />
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </Panel>
  );
}

function ExperienceForm({ entry, allSkills, onDone, onCancel }: { entry?: ExperienceEntry; allSkills: SkillOption[]; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    title: entry?.title ?? "",
    organization: entry?.organization ?? "",
    location: entry?.location ?? "",
    startDate: entry?.startDate ?? "",
    endDate: entry?.endDate ?? "",
    description: entry?.description ?? "",
    highlights: entry?.highlights.join("\n") ?? "",
    contentStatus: entry?.contentStatus ?? ("published" as ContentStatus),
    publishAt: toLocalInput(entry?.publishAt),
  });
  const [skillIds, toggleSkill] = useSkillSet(allSkills, entry?.skills);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await adminRequest(entry ? `/cv/experience/${entry.id}` : "/cv/experience", {
      method: entry ? "PATCH" : "POST",
      body: {
        title: f.title.trim(),
        organization: f.organization.trim(),
        location: f.location.trim() || null,
        startDate: f.startDate,
        endDate: f.endDate || null,
        description: f.description.trim(),
        highlights: lines(f.highlights),
        contentStatus: f.contentStatus,
        ...(f.contentStatus === "published" ? { publishAt: fromLocalInput(f.publishAt) } : {}),
        skillIds: [...skillIds],
      },
    });
    setSaving(false);
    if (!res.ok) return setError(res.message);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-ink/10 bg-paper p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="x-title" className={adminLabel}>Title</label><input id="x-title" className={adminInput} value={f.title} onChange={(e) => set("title", e.target.value)} /></div>
        <div><label htmlFor="x-org" className={adminLabel}>Organisation</label><input id="x-org" className={adminInput} value={f.organization} onChange={(e) => set("organization", e.target.value)} /></div>
        <div><label htmlFor="x-loc" className={adminLabel}>Location <span className="font-normal text-slate">(optional)</span></label><input id="x-loc" className={adminInput} value={f.location} onChange={(e) => set("location", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label htmlFor="x-start" className={adminLabel}>Start</label><input id="x-start" type="date" className={adminInput} value={f.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
          <div><label htmlFor="x-end" className={adminLabel}>End</label><input id="x-end" type="date" className={adminInput} value={f.endDate} onChange={(e) => set("endDate", e.target.value)} /><p className={adminHint}>Empty = present</p></div>
        </div>
        <div className="sm:col-span-2"><label htmlFor="x-desc" className={adminLabel}>What the role was</label><textarea id="x-desc" rows={3} className={adminInput} value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
        <div className="sm:col-span-2">
          <label htmlFor="x-hl" className={adminLabel}>Highlights</label>
          <textarea id="x-hl" rows={5} className={adminInput} value={f.highlights} onChange={(e) => set("highlights", e.target.value)} placeholder={"One per line — what you did and what it changed"} />
          <p className={adminHint}>One bullet per line, up to 15, 300 characters each. Tailoring puts the most relevant first.</p>
        </div>
        <PublishFields idPrefix="x" status={f.contentStatus} publishAt={f.publishAt} onStatus={(s) => set("contentStatus", s)} onPublishAt={(v) => set("publishAt", v)} />
        <div className="sm:col-span-2"><p className={adminLabel}>Skills used</p><SkillPicker allSkills={allSkills} selected={skillIds} onToggle={toggleSkill} /></div>
      </div>
      <FormActions saving={saving} disabled={!f.title.trim() || !f.organization.trim() || !f.startDate || !f.description.trim()} label="Save role" onCancel={onCancel} error={error} />
    </form>
  );
}

// ---------- education ----------

function EducationSection({ now, entries, allSkills }: { now: number; entries: EducationEntry[]; allSkills: SkillOption[] }) {
  const { editingId, setEditingId, error, remove, done } = useCrud("/cv/education");
  return (
    <Panel
      title="Education"
      description="Only published entries appear on /cv and the generated CV."
      actions={editingId === null ? <button type="button" onClick={() => setEditingId("new")} className={adminButton.secondary}><Plus aria-hidden="true" /> Add education</button> : undefined}
    >
      {error && <p className="mb-3 text-sm text-critical">{error}</p>}
      {editingId === "new" && <div className="mb-4"><EducationForm allSkills={allSkills} onDone={done} onCancel={() => setEditingId(null)} /></div>}
      {entries.length === 0 && editingId !== "new" ? (
        <EmptyState icon={GraduationCap}>No education yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-ink/10">
          {entries.map((e) =>
            editingId === e.id ? (
              <li key={e.id} className="py-3"><EducationForm entry={e} allSkills={allSkills} onDone={done} onCancel={() => setEditingId(null)} /></li>
            ) : (
              <li key={e.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{e.qualification}{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ""}</p>
                  <p className="text-xs text-slate">
                    {e.institution} · {e.startDate} – {e.endDate ?? (e.expectedGraduation ? `expected ${e.expectedGraduation}` : "present")}
                  </p>
                  {e.honors && <p className="mt-1 text-xs text-slate">{e.honors}</p>}
                  {e.coursework.length > 0 && <p className="mt-1 text-xs text-slate">{e.coursework.length} modules</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <StatusPill status={e.contentStatus} publishAt={e.publishAt} now={now} />
                  <RowActions label={e.qualification} onEdit={() => setEditingId(e.id)} onRemove={() => remove(e.id)} />
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </Panel>
  );
}

function EducationForm({ entry, allSkills, onDone, onCancel }: { entry?: EducationEntry; allSkills: SkillOption[]; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    institution: entry?.institution ?? "",
    qualification: entry?.qualification ?? "",
    fieldOfStudy: entry?.fieldOfStudy ?? "",
    startDate: entry?.startDate ?? "",
    endDate: entry?.endDate ?? "",
    expectedGraduation: entry?.expectedGraduation ?? "",
    honors: entry?.honors ?? "",
    description: entry?.description ?? "",
    certificateUrl: entry?.certificateUrl ?? "",
    coursework: entry?.coursework.join("\n") ?? "",
    contentStatus: entry?.contentStatus ?? ("published" as ContentStatus),
    publishAt: toLocalInput(entry?.publishAt),
  });
  const [skillIds, toggleSkill] = useSkillSet(allSkills, entry?.skills);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await adminRequest(entry ? `/cv/education/${entry.id}` : "/cv/education", {
      method: entry ? "PATCH" : "POST",
      body: {
        institution: f.institution.trim(),
        qualification: f.qualification.trim(),
        fieldOfStudy: f.fieldOfStudy.trim() || null,
        startDate: f.startDate,
        endDate: f.endDate || null,
        // An expected finish only makes sense while still studying (#74).
        expectedGraduation: f.endDate ? null : f.expectedGraduation || null,
        honors: f.honors.trim() || null,
        description: f.description.trim() || null,
        certificateUrl: f.certificateUrl.trim() || null,
        coursework: lines(f.coursework),
        contentStatus: f.contentStatus,
        ...(f.contentStatus === "published" ? { publishAt: fromLocalInput(f.publishAt) } : {}),
        skillIds: [...skillIds],
      },
    });
    setSaving(false);
    if (!res.ok) return setError(res.message);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-ink/10 bg-paper p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="e-inst" className={adminLabel}>Institution</label><input id="e-inst" className={adminInput} value={f.institution} onChange={(e) => set("institution", e.target.value)} /></div>
        <div><label htmlFor="e-qual" className={adminLabel}>Qualification</label><input id="e-qual" className={adminInput} value={f.qualification} onChange={(e) => set("qualification", e.target.value)} /></div>
        <div><label htmlFor="e-field" className={adminLabel}>Field of study <span className="font-normal text-slate">(optional)</span></label><input id="e-field" className={adminInput} value={f.fieldOfStudy} onChange={(e) => set("fieldOfStudy", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label htmlFor="e-start" className={adminLabel}>Start</label><input id="e-start" type="date" className={adminInput} value={f.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
          <div><label htmlFor="e-end" className={adminLabel}>End</label><input id="e-end" type="date" className={adminInput} value={f.endDate} onChange={(e) => set("endDate", e.target.value)} /><p className={adminHint}>Empty = still studying</p></div>
        </div>
        {!f.endDate && (
          <div><label htmlFor="e-expected" className={adminLabel}>Expected to finish <span className="font-normal text-slate">(optional)</span></label><input id="e-expected" type="date" className={adminInput} value={f.expectedGraduation} onChange={(e) => set("expectedGraduation", e.target.value)} /></div>
        )}
        <div><label htmlFor="e-honors" className={adminLabel}>Honours <span className="font-normal text-slate">(optional)</span></label><input id="e-honors" className={adminInput} value={f.honors} onChange={(e) => set("honors", e.target.value)} /></div>
        <div className="sm:col-span-2"><label htmlFor="e-desc" className={adminLabel}>Description <span className="font-normal text-slate">(optional)</span></label><textarea id="e-desc" rows={2} className={adminInput} value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
        <div className="sm:col-span-2"><label htmlFor="e-cert" className={adminLabel}>Certificate link <span className="font-normal text-slate">(optional)</span></label><input id="e-cert" className={adminInput} value={f.certificateUrl} onChange={(e) => set("certificateUrl", e.target.value)} placeholder="https://" /></div>
        <div className="sm:col-span-2">
          <label htmlFor="e-course" className={adminLabel}>Relevant modules</label>
          <textarea id="e-course" rows={4} className={adminInput} value={f.coursework} onChange={(e) => set("coursework", e.target.value)} placeholder="One per line" />
          <p className={adminHint}>Up to 30. Standard on a student&apos;s CV.</p>
        </div>
        <PublishFields idPrefix="e" status={f.contentStatus} publishAt={f.publishAt} onStatus={(s) => set("contentStatus", s)} onPublishAt={(v) => set("publishAt", v)} />
        <div className="sm:col-span-2"><p className={adminLabel}>Skills it taught</p><SkillPicker allSkills={allSkills} selected={skillIds} onToggle={toggleSkill} /></div>
      </div>
      <FormActions saving={saving} disabled={!f.institution.trim() || !f.qualification.trim() || !f.startDate} label="Save education" onCancel={onCancel} error={error} />
    </form>
  );
}

// ---------- skills ----------

function SkillsSection({ entries, categories }: { entries: SkillEntry[]; categories: { id: string; label: string }[] }) {
  const { editingId, setEditingId, error, remove, done } = useCrud("/cv/skills");
  const grouped = categories
    .map((c) => ({ label: c.label, skills: entries.filter((s) => s.category === c.label) }))
    .concat([{ label: "Other", skills: entries.filter((s) => !categories.some((c) => c.label === s.category)) }])
    .filter((g) => g.skills.length > 0);

  return (
    <Panel
      title="Skills"
      description="Grouped by category (a lookup — add categories in Settings). A skill still linked to a role, degree or system can't be removed."
      actions={editingId === null ? <button type="button" onClick={() => setEditingId("new")} className={adminButton.secondary}><Plus aria-hidden="true" /> Add skill</button> : undefined}
    >
      {error && <p className="mb-3 text-sm text-critical">{error}</p>}
      {editingId === "new" && <div className="mb-4"><SkillForm categories={categories} onDone={done} onCancel={() => setEditingId(null)} /></div>}
      {entries.length === 0 && editingId !== "new" ? (
        <EmptyState icon={Wrench}>No skills yet.</EmptyState>
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => (
            <div key={g.label}>
              <p className="mb-2 text-xs font-medium text-slate">{g.label}</p>
              <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10">
                {g.skills.map((s) =>
                  editingId === s.id ? (
                    <li key={s.id} className="p-3"><SkillForm entry={s} categories={categories} onDone={done} onCancel={() => setEditingId(null)} /></li>
                  ) : (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="text-sm text-ink">{s.name}{s.yearsExperience ? <span className="text-slate"> · {s.yearsExperience} yr</span> : null}</span>
                      <span className="flex items-center gap-1"><RowActions label={s.name} onEdit={() => setEditingId(s.id)} onRemove={() => remove(s.id)} /></span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function SkillForm({ entry, categories, onDone, onCancel }: { entry?: SkillEntry; categories: { id: string; label: string }[]; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(entry?.name ?? "");
  const [categoryId, setCategoryId] = useState(categories.find((c) => c.label === entry?.category)?.id ?? categories[0]?.id ?? "");
  const [years, setYears] = useState(entry?.yearsExperience?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await adminRequest(entry ? `/cv/skills/${entry.id}` : "/cv/skills", {
      method: entry ? "PATCH" : "POST",
      body: { name: name.trim(), categoryId, yearsExperience: years ? Number(years) : null },
    });
    setSaving(false);
    if (!res.ok) return setError(res.message);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-ink/10 bg-paper p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label htmlFor="s-name" className={adminLabel}>Name</label><input id="s-name" className={adminInput} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div>
          <label htmlFor="s-cat" className={adminLabel}>Category</label>
          <select id="s-cat" className={adminInput} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div><label htmlFor="s-years" className={adminLabel}>Years <span className="font-normal text-slate">(optional)</span></label><input id="s-years" type="number" step="0.5" min="0" className={adminInput} value={years} onChange={(e) => setYears(e.target.value)} /></div>
      </div>
      <FormActions saving={saving} disabled={!name.trim() || !categoryId} label="Save skill" onCancel={onCancel} error={error} />
    </form>
  );
}
