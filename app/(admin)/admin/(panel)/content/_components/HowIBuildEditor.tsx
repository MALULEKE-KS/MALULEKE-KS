// app/(admin)/admin/(panel)/content/_components/HowIBuildEditor.tsx
// The mission and principles block (#106): reorder, add, remove, and save
// the whole block at once (PUT replaces it). Limits mirror the block schema;
// the server validates again.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Save } from "lucide-react";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { adminButton, adminHint, adminInput, adminLabel } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

interface Principle {
  name: string;
  summary: string;
  body: string;
}
interface Body {
  mission: string;
  principles: Principle[];
}

const MAX_PRINCIPLES = 8;

export function HowIBuildEditor({ initial }: { initial: Body | null }) {
  const router = useRouter();
  const [body, setBody] = useState<Body>(initial ?? { mission: "", principles: [{ name: "", summary: "", body: "" }] });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(body) !== JSON.stringify(initial);

  const setPrinciple = (i: number, patch: Partial<Principle>) =>
    setBody((b) => ({ ...b, principles: b.principles.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const move = (i: number, by: -1 | 1) =>
    setBody((b) => {
      const list = [...b.principles];
      const [item] = list.splice(i, 1);
      list.splice(i + by, 0, item!);
      return { ...b, principles: list };
    });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await adminRequest("/content/how-i-build", { method: "PUT", body });
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: res.message });
    setMessage({ ok: true, text: "Saved — live on the site now." });
    router.refresh();
  }

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      <div>
        <label htmlFor="mission" className={adminLabel}>Mission</label>
        <textarea id="mission" rows={3} maxLength={400} className={adminInput} value={body.mission} onChange={(e) => setBody((b) => ({ ...b, mission: e.target.value }))} />
        <p className={adminHint}>{body.mission.length}/400</p>
      </div>

      <ol className="space-y-4">
        {body.principles.map((p, i) => (
          <li key={i} className="rounded-xl border border-ink/10 bg-paper p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate">Principle {String(i + 1).padStart(2, "0")}</span>
              <span className="flex items-center gap-1">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg p-1.5 text-slate hover:bg-ink/5 hover:text-ink disabled:opacity-30" aria-label="Move up"><ArrowUp aria-hidden="true" className="size-4" /></button>
                <button type="button" disabled={i === body.principles.length - 1} onClick={() => move(i, 1)} className="rounded-lg p-1.5 text-slate hover:bg-ink/5 hover:text-ink disabled:opacity-30" aria-label="Move down"><ArrowDown aria-hidden="true" className="size-4" /></button>
                {body.principles.length > 1 && (
                  <ConfirmDelete label={p.name || `principle ${i + 1}`} onConfirm={() => setBody((b) => ({ ...b, principles: b.principles.filter((_, j) => j !== i) }))} />
                )}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label htmlFor={`p${i}-name`} className={adminLabel}>Name</label>
                <input id={`p${i}-name`} maxLength={80} className={adminInput} value={p.name} onChange={(e) => setPrinciple(i, { name: e.target.value })} />
              </div>
              <div>
                <label htmlFor={`p${i}-summary`} className={adminLabel}>One line</label>
                <input id={`p${i}-summary`} maxLength={160} className={adminInput} value={p.summary} onChange={(e) => setPrinciple(i, { summary: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor={`p${i}-body`} className={adminLabel}>In full</label>
                <textarea id={`p${i}-body`} rows={3} maxLength={800} className={adminInput} value={p.body} onChange={(e) => setPrinciple(i, { body: e.target.value })} />
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={body.principles.length >= MAX_PRINCIPLES}
          onClick={() => setBody((b) => ({ ...b, principles: [...b.principles, { name: "", summary: "", body: "" }] }))}
          className={adminButton.secondary}
        >
          <Plus aria-hidden="true" /> Add principle
        </button>
        <button type="submit" disabled={!dirty || busy} className={adminButton.primary}>
          <Save aria-hidden="true" /> {busy ? "Saving…" : "Save"}
        </button>
        {dirty && initial && <button type="button" onClick={() => setBody(initial)} className={adminButton.ghost}>Discard</button>}
        {message && <p role="status" className={cn("text-sm", message.ok ? "text-signal-finished" : "text-critical")}>{message.text}</p>}
      </div>
    </form>
  );
}
