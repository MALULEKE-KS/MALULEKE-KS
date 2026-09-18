// app/(admin)/admin/cv/_components/CvManager.tsx
// Colocated — only used on /admin/cv. Three tabs, each a self-contained
// list + add/edit form talking directly to its own REST resource. Deleting
// an in-use Skill surfaces the 409 inline (mirrors the BR-1.1 publish-block
// UX pattern established on /admin/systems/[id]) rather than a raw error.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ExperienceEntry {
  id: string;
  title: string;
  organization: string;
  startDate: string;
  endDate: string | null;
  description: string;
  skills: string[];
}

interface EducationEntry {
  id: string;
  institution: string;
  qualification: string;
  startDate: string;
  endDate: string | null;
  honors: string | null;
}

interface SkillEntry {
  id: string;
  name: string;
  category: string;
  yearsExperience: number | null;
}

interface CvManagerProps {
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillEntry[];
  categories: { id: string; label: string }[];
  allSkillsForPicker: { id: string; name: string }[];
}

type Tab = "experience" | "education" | "skills";

const inputClass =
  "w-full border-b border-slate/30 bg-transparent px-0 py-2 font-mono text-sm text-ink outline-none focus:border-accent";
const labelClass = "font-sans text-sm text-ink block mb-1";
const buttonClass =
  "font-sans text-xs font-medium bg-ink text-paper px-4 py-2 transition-colors hover:bg-ink/85 disabled:opacity-50";
const ghostButtonClass = "font-mono text-xs text-slate hover:text-accent transition-colors";

export function CvManager({ experience, education, skills, categories, allSkillsForPicker }: CvManagerProps) {
  const [tab, setTab] = useState<Tab>("experience");

  return (
    <div>
      <div className="flex gap-4 mb-8 border-b border-slate/20 font-mono text-xs">
        {(["experience", "education", "skills"] as Tab[]).map((t) => (
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

      {tab === "experience" && <ExperienceSection entries={experience} allSkills={allSkillsForPicker} />}
      {tab === "education" && <EducationSection entries={education} />}
      {tab === "skills" && <SkillsSection entries={skills} categories={categories} />}
    </div>
  );
}

// ============================================================
// EXPERIENCE
// ============================================================

function ExperienceSection({
  entries,
  allSkills,
}: {
  entries: ExperienceEntry[];
  allSkills: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function handleDelete(id: string) {
    await fetch(`/api/v1/admin/cv/experience/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-slate/10 border-t border-b border-slate/20">
        {entries.map((entry) =>
          editingId === entry.id ? (
            <li key={entry.id} className="py-4">
              <ExperienceForm
                entry={entry}
                allSkills={allSkills}
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
                  {entry.organization} · {entry.startDate} – {entry.endDate ?? "Present"}
                </p>
                {entry.skills.length > 0 && (
                  <p className="font-mono text-xs text-slate mt-1">{entry.skills.join(", ")}</p>
                )}
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
        <ExperienceForm
          allSkills={allSkills}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button type="button" className={ghostButtonClass} onClick={() => setAdding(true)}>
          + Add experience
        </button>
      )}
    </div>
  );
}

function ExperienceForm({
  entry,
  allSkills,
  onDone,
  onCancel,
}: {
  entry?: ExperienceEntry;
  allSkills: { id: string; name: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [organization, setOrganization] = useState(entry?.organization ?? "");
  const [startDate, setStartDate] = useState(entry?.startDate ?? "");
  const [endDate, setEndDate] = useState(entry?.endDate ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [skillIds, setSkillIds] = useState<Set<string>>(
    new Set(allSkills.filter((s) => entry?.skills.includes(s.name)).map((s) => s.id))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSkill(id: string) {
    setSkillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(entry ? `/api/v1/admin/cv/experience/${entry.id}` : "/api/v1/admin/cv/experience", {
        method: entry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          organization,
          startDate,
          endDate: endDate || null,
          description,
          skillIds: [...skillIds],
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
          <label className={labelClass}>Title</label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Organization</label>
          <input
            className={inputClass}
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Start date</label>
          <input
            type="date"
            className={inputClass}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>End date (blank = present)</label>
          <input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          rows={3}
          className="w-full border border-slate/30 bg-transparent px-3 py-2 font-sans text-sm text-ink outline-none focus:border-accent"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      {allSkills.length > 0 && (
        <div>
          <span className="font-mono text-xs text-slate block mb-2">Skills</span>
          <div className="flex flex-wrap gap-2">
            {allSkills.map((skill) => (
              <label
                key={skill.id}
                className={`font-mono text-xs px-2 py-1 border cursor-pointer ${
                  skillIds.has(skill.id) ? "border-accent text-accent" : "border-slate/30 text-slate"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={skillIds.has(skill.id)}
                  onChange={() => toggleSkill(skill.id)}
                />
                {skill.name}
              </label>
            ))}
          </div>
        </div>
      )}

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

// ============================================================
// EDUCATION
// ============================================================

function EducationSection({ entries }: { entries: EducationEntry[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function handleDelete(id: string) {
    await fetch(`/api/v1/admin/cv/education/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-slate/10 border-t border-b border-slate/20">
        {entries.map((entry) =>
          editingId === entry.id ? (
            <li key={entry.id} className="py-4">
              <EducationForm
                entry={entry}
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
                <p className="font-sans text-sm font-medium text-ink">{entry.qualification}</p>
                <p className="font-mono text-xs text-slate">
                  {entry.institution} · {entry.startDate} – {entry.endDate ?? "Present"}
                </p>
                {entry.honors && <p className="font-mono text-xs text-slate mt-1">{entry.honors}</p>}
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
        <EducationForm
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button type="button" className={ghostButtonClass} onClick={() => setAdding(true)}>
          + Add education
        </button>
      )}
    </div>
  );
}

function EducationForm({
  entry,
  onDone,
  onCancel,
}: {
  entry?: EducationEntry;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [institution, setInstitution] = useState(entry?.institution ?? "");
  const [qualification, setQualification] = useState(entry?.qualification ?? "");
  const [startDate, setStartDate] = useState(entry?.startDate ?? "");
  const [endDate, setEndDate] = useState(entry?.endDate ?? "");
  const [honors, setHonors] = useState(entry?.honors ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(entry ? `/api/v1/admin/cv/education/${entry.id}` : "/api/v1/admin/cv/education", {
        method: entry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution,
          qualification,
          startDate,
          endDate: endDate || null,
          honors: honors || null,
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
          <label className={labelClass}>Institution</label>
          <input className={inputClass} value={institution} onChange={(e) => setInstitution(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Qualification</label>
          <input
            className={inputClass}
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Start date</label>
          <input
            type="date"
            className={inputClass}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>End date (blank = present)</label>
          <input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Honors (optional)</label>
        <input className={inputClass} value={honors} onChange={(e) => setHonors(e.target.value)} />
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

// ============================================================
// SKILLS
// ============================================================

function SkillsSection({
  entries,
  categories,
}: {
  entries: SkillEntry[];
  categories: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);

  async function handleDelete(id: string) {
    setDeleteError(null);
    const res = await fetch(`/api/v1/admin/cv/skills/${id}`, { method: "DELETE" });
    if (res.status === 409) {
      const body = await res.json().catch(() => null);
      setDeleteError({ id, message: body?.error?.message ?? "This skill is still in use." });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-slate/10 border-t border-b border-slate/20">
        {entries.map((entry) =>
          editingId === entry.id ? (
            <li key={entry.id} className="py-4">
              <SkillForm
                entry={entry}
                categories={categories}
                onDone={() => {
                  setEditingId(null);
                  router.refresh();
                }}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={entry.id} className="py-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-sans text-sm font-medium text-ink">
                    {entry.name}
                    {entry.yearsExperience ? ` — ${entry.yearsExperience}y` : ""}
                  </p>
                  <p className="font-mono text-xs text-slate">{entry.category}</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button type="button" className={ghostButtonClass} onClick={() => setEditingId(entry.id)}>
                    Edit
                  </button>
                  <button type="button" className={ghostButtonClass} onClick={() => handleDelete(entry.id)}>
                    Delete
                  </button>
                </div>
              </div>
              {deleteError?.id === entry.id && (
                <p className="font-mono text-xs text-critical mt-1">{deleteError.message}</p>
              )}
            </li>
          )
        )}
      </ul>

      {adding ? (
        <SkillForm
          categories={categories}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button type="button" className={ghostButtonClass} onClick={() => setAdding(true)}>
          + Add skill
        </button>
      )}
    </div>
  );
}

function SkillForm({
  entry,
  categories,
  onDone,
  onCancel,
}: {
  entry?: SkillEntry;
  categories: { id: string; label: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(entry?.name ?? "");
  const [categoryId, setCategoryId] = useState(
    categories.find((c) => c.label === entry?.category)?.id ?? categories[0]?.id ?? ""
  );
  const [yearsExperience, setYearsExperience] = useState(entry?.yearsExperience?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(entry ? `/api/v1/admin/cv/skills/${entry.id}` : "/api/v1/admin/cv/skills", {
        method: entry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          categoryId,
          yearsExperience: yearsExperience ? Number(yearsExperience) : null,
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Years (optional)</label>
          <input
            type="number"
            step="0.5"
            min="0"
            className={inputClass}
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
          />
        </div>
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
