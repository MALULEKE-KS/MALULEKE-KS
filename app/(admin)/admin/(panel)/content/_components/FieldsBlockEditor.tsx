// app/(admin)/admin/(panel)/content/_components/FieldsBlockEditor.tsx
// An editor for a content block made of text fields and short lists (#106):
// the home introduction, the AI guide section. The fields and their limits
// mirror the block's schema (lib/content/blocks.ts); the server validates again.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, X } from "lucide-react";
import { adminButton, adminHint, adminInput, adminLabel } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

export type BlockField =
  | { name: string; label: string; max: number; kind: "line" | "text" }
  | { name: string; label: string; max: number; kind: "list"; maxItems: number };

type Body = Record<string, string | string[]>;

export function FieldsBlockEditor({ blockKey, fields, initial }: { blockKey: string; fields: BlockField[]; initial: Body | null }) {
  const router = useRouter();
  const empty = Object.fromEntries(fields.map((f) => [f.name, f.kind === "list" ? [""] : ""])) as Body;
  const [body, setBody] = useState<Body>(initial ?? empty);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(body) !== JSON.stringify(initial);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await adminRequest(`/content/${blockKey}`, { method: "PUT", body });
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: res.message });
    setMessage({ ok: true, text: "Saved — live on the site now." });
    router.refresh();
  }

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      {fields.map((f) => {
        const id = `${blockKey}-${f.name}`;
        if (f.kind === "list") {
          const items = (body[f.name] as string[]) ?? [];
          const setItems = (next: string[]) => setBody((b) => ({ ...b, [f.name]: next }));
          return (
            <fieldset key={f.name}>
              <legend className={adminLabel}>{f.label}</legend>
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <input
                      aria-label={`${f.label} ${i + 1}`}
                      maxLength={f.max}
                      className={adminInput}
                      value={item}
                      onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                    {items.length > 1 && (
                      <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="rounded-lg p-2 text-slate hover:bg-ink/5 hover:text-ink" aria-label={`Remove ${f.label.toLowerCase()} ${i + 1}`}>
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <button type="button" disabled={items.length >= f.maxItems} onClick={() => setItems([...items, ""])} className={cn(adminButton.secondary, "mt-2")}>
                <Plus aria-hidden="true" /> Add
              </button>
              <p className={adminHint}>Up to {f.maxItems}, each up to {f.max} characters.</p>
            </fieldset>
          );
        }
        const value = (body[f.name] as string) ?? "";
        return (
          <div key={f.name}>
            <label htmlFor={id} className={adminLabel}>{f.label}</label>
            {f.kind === "text" ? (
              <textarea id={id} rows={4} maxLength={f.max} className={adminInput} value={value} onChange={(e) => setBody((b) => ({ ...b, [f.name]: e.target.value }))} />
            ) : (
              <input id={id} maxLength={f.max} className={adminInput} value={value} onChange={(e) => setBody((b) => ({ ...b, [f.name]: e.target.value }))} />
            )}
            <p className={adminHint}>{value.length}/{f.max}</p>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!dirty || busy} className={adminButton.primary}>
          <Save aria-hidden="true" /> {busy ? "Saving…" : "Save"}
        </button>
        {dirty && initial && <button type="button" onClick={() => setBody(initial)} className={adminButton.ghost}>Discard</button>}
        {message && <p role="status" className={cn("text-sm", message.ok ? "text-signal-finished" : "text-critical")}>{message.text}</p>}
      </div>
    </form>
  );
}
