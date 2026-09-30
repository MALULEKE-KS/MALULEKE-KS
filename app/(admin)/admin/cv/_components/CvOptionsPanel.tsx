// app/(admin)/admin/cv/_components/CvOptionsPanel.tsx
// Colocated — only used on /admin/cv. The two CV options visitors get (#92):
// upload the owner's CV file (PDF or Word, checked by content — BR-7.6), see
// every version and make an earlier one current again (BR-7.2), and choose
// which options are shown, which comes first, and their labels (BR-7.5). The
// database refuses an invalid combination; its reason is shown inline.
// Styling follows CvManager; the admin UI is finalised in F5.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

const inputClass =
  "w-full border-b border-slate/30 bg-transparent px-0 py-2 font-mono text-sm text-ink outline-none focus:border-accent";
const labelClass = "font-sans text-sm text-ink block mb-1";
const buttonClass =
  "font-sans text-xs font-medium bg-ink text-paper px-4 py-2 transition-colors hover:bg-ink/85 disabled:opacity-50";
const ghostButtonClass = "font-mono text-xs text-slate hover:text-accent transition-colors";

async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error?.message ?? `Request failed (${res.status}).`;
}

export function CvOptionsPanel({ versions, options }: { versions: CvUploadVersion[]; options: CvOptionsSettings }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState(options);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function run(action: () => Promise<Response>, success: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await action();
      if (!res.ok) {
        setMessage({ tone: "error", text: await errorMessage(res) });
        return;
      }
      setMessage({ tone: "ok", text: success });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function upload() {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    return run(() => fetch("/api/v1/admin/cv/uploads", { method: "POST", body }), "Uploaded — it's now the current file.");
  }

  const restore = (id: string) =>
    run(() => fetch(`/api/v1/admin/cv/uploads/${id}/restore`, { method: "POST" }), "That version is current again.");

  const saveOptions = () =>
    run(
      () =>
        fetch("/api/v1/admin/cv/options", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
      "CV options saved.",
    );

  return (
    <div className="mb-12 space-y-8 border-b border-slate/20 pb-10">
      <div>
        <h2 className="font-sans text-lg font-semibold text-ink mb-1">Uploaded CV</h2>
        <p className="font-mono text-xs text-slate mb-4">
          PDF or Word (.docx). A new upload replaces the current file of the same format; earlier versions are kept.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="font-mono text-xs text-ink"
          />
          <button type="button" className={buttonClass} disabled={!file || busy} onClick={upload}>
            Upload
          </button>
        </div>

        {versions.length > 0 && (
          <ul className="mt-4 divide-y divide-slate/15">
            {versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2 font-mono text-xs">
                <span className="text-ink">
                  {v.format.toUpperCase()} · {v.fileName} · {(v.byteSize / 1024).toFixed(0)} KB ·{" "}
                  {new Date(v.uploadedAt).toLocaleString("en-GB")}
                  {v.current && <span className="text-accent"> · current</span>}
                </span>
                <span className="flex gap-3">
                  <a className={ghostButtonClass} href={`/api/v1/admin/cv/uploads/${v.id}`}>
                    Download
                  </a>
                  {!v.current && (
                    <button type="button" className={ghostButtonClass} disabled={busy} onClick={() => restore(v.id)}>
                      Make current
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="font-sans text-lg font-semibold text-ink mb-4">What visitors can download</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {(["generated", "uploaded"] as const).map((kind) => {
            const show = kind === "generated" ? "showGenerated" : "showUploaded";
            const label = kind === "generated" ? "generatedLabel" : "uploadedLabel";
            const note = kind === "generated" ? "generatedNote" : "uploadedNote";
            return (
              <fieldset key={kind} className="space-y-3">
                <label className="flex items-center gap-2 font-sans text-sm text-ink">
                  <input type="checkbox" checked={form[show]} onChange={(e) => setForm({ ...form, [show]: e.target.checked })} />
                  Show the {kind} CV
                </label>
                <label className="flex items-center gap-2 font-sans text-sm text-ink">
                  <input
                    type="radio"
                    name="firstOption"
                    checked={form.firstOption === kind}
                    onChange={() => setForm({ ...form, firstOption: kind })}
                  />
                  List it first
                </label>
                <div>
                  <label className={labelClass}>Label</label>
                  <input className={inputClass} value={form[label]} maxLength={60} onChange={(e) => setForm({ ...form, [label]: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Note</label>
                  <input className={inputClass} value={form[note]} maxLength={200} onChange={(e) => setForm({ ...form, [note]: e.target.value })} />
                </div>
              </fieldset>
            );
          })}
        </div>
        <button type="button" className={`${buttonClass} mt-6`} disabled={busy} onClick={saveOptions}>
          Save CV options
        </button>
      </div>

      {message && (
        <p className={`font-mono text-xs ${message.tone === "error" ? "text-critical" : "text-slate"}`}>{message.text}</p>
      )}
    </div>
  );
}
