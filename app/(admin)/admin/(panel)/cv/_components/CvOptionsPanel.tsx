// app/(admin)/admin/(panel)/cv/_components/CvOptionsPanel.tsx
// The two CV options visitors get (#92): upload the owner's CV file (PDF or
// Word, checked by content — BR-7.6), see every version and make an earlier
// one current again (BR-7.2), and choose which options are shown, which comes
// first, and their labels (BR-7.5). The database refuses an invalid
// combination; its reason is shown inline.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, RotateCcw, Save } from "lucide-react";
import { adminButton, adminInput, adminLabel, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { adminRequest, toSignIn } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

export interface CvUploadVersion {
  id: string;
  format: string;
  fileName: string;
  byteSize: number;
  uploadedAt: string;
  current: boolean;
}

export interface CvOptionsSettings {
  showGenerated: boolean;
  showUploaded: boolean;
  firstOption: "generated" | "uploaded";
  generatedLabel: string;
  generatedNote: string;
  uploadedLabel: string;
  uploadedNote: string;
}

export function CvOptionsPanel({ versions, options }: { versions: CvUploadVersion[]; options: CvOptionsSettings }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState(options);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(options);

  async function finish(res: { ok: boolean; message?: string }, success: string) {
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: res.message ?? "That didn't go through." });
    setMessage({ ok: true, text: success });
    router.refresh();
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    const body = new FormData();
    body.append("file", file);
    // Multipart, so not through adminRequest's JSON body.
    const res = await fetch("/api/v1/admin/cv/uploads", { method: "POST", body }).catch(() => null);
    if (res?.status === 401) return toSignIn();
    const payload = res && !res.ok ? await res.json().catch(() => null) : null;
    setFile(null);
    await finish({ ok: !!res?.ok, message: payload?.error?.message }, "Uploaded — it's now the current file.");
  }

  async function restore(id: string) {
    setBusy(true);
    setMessage(null);
    const res = await adminRequest(`/cv/uploads/${id}/restore`, { method: "POST" });
    await finish(res.ok ? { ok: true } : { ok: false, message: res.message }, "That version is current again.");
  }

  async function saveOptions() {
    setBusy(true);
    setMessage(null);
    const res = await adminRequest("/cv/options", { method: "PATCH", body: form });
    await finish(res.ok ? { ok: true } : { ok: false, message: res.message }, "CV options saved.");
  }

  return (
    <div className="mb-6 grid gap-6 xl:grid-cols-2">
      <Panel title="Uploaded CV" description="PDF or Word (.docx). A new upload replaces the current file of the same format; earlier versions are kept.">
        <div className="flex flex-wrap items-center gap-3">
          <label className={cn(adminButton.secondary, "cursor-pointer")}>
            <FileUp aria-hidden="true" /> {file ? file.name : "Choose a file"}
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button type="button" className={adminButton.dark} disabled={!file || busy} onClick={upload}>Upload</button>
        </div>
        {versions.length > 0 && (
          <ul className="mt-4 divide-y divide-ink/10">
            {versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 last:pb-0">
                <span className="min-w-0 text-sm">
                  <span className="flex items-center gap-2">
                    <Pill>{v.format}</Pill>
                    <span className="truncate text-ink">{v.fileName}</span>
                    {v.current && <Pill tone="good">current</Pill>}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate">{Math.max(1, Math.round(v.byteSize / 1024))} KB · {formatWhen(v.uploadedAt)}</span>
                </span>
                <span className="flex gap-1">
                  <a className={cn(adminButton.ghost, "px-3 py-1.5")} href={`/api/v1/admin/cv/uploads/${v.id}`}><Download aria-hidden="true" /> Download</a>
                  {!v.current && (
                    <button type="button" className={cn(adminButton.ghost, "px-3 py-1.5")} disabled={busy} onClick={() => restore(v.id)}>
                      <RotateCcw aria-hidden="true" /> Make current
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="What visitors can download" description="At least one option stays on; the first one listed must be shown (BR-7.5).">
        <div className="grid gap-5 sm:grid-cols-2">
          {(["generated", "uploaded"] as const).map((kind) => {
            const show = kind === "generated" ? "showGenerated" : "showUploaded";
            const label = kind === "generated" ? "generatedLabel" : "uploadedLabel";
            const note = kind === "generated" ? "generatedNote" : "uploadedNote";
            return (
              <fieldset key={kind} className="space-y-3 rounded-xl border border-ink/10 bg-paper p-4">
                <legend className="sr-only">The {kind} CV</legend>
                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                  <input type="checkbox" className="size-4 accent-ember" checked={form[show]} onChange={(e) => setForm({ ...form, [show]: e.target.checked })} />
                  Show the {kind} CV
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="radio" className="size-4 accent-ember" name="firstOption" checked={form.firstOption === kind} onChange={() => setForm({ ...form, firstOption: kind })} />
                  List it first
                </label>
                <div>
                  <label htmlFor={`${kind}-label`} className={adminLabel}>Label</label>
                  <input id={`${kind}-label`} className={adminInput} value={form[label]} maxLength={60} onChange={(e) => setForm({ ...form, [label]: e.target.value })} />
                </div>
                <div>
                  <label htmlFor={`${kind}-note`} className={adminLabel}>Note</label>
                  <input id={`${kind}-note`} className={adminInput} value={form[note]} maxLength={200} onChange={(e) => setForm({ ...form, [note]: e.target.value })} />
                </div>
              </fieldset>
            );
          })}
        </div>
        <button type="button" className={cn(adminButton.primary, "mt-5")} disabled={busy || !dirty} onClick={saveOptions}>
          <Save aria-hidden="true" /> Save CV options
        </button>
      </Panel>

      {message && (
        <p role="status" className={cn("text-sm xl:col-span-2", message.ok ? "text-signal-finished" : "text-critical")}>{message.text}</p>
      )}
    </div>
  );
}
