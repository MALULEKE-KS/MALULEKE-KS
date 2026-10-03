// app/(admin)/admin/(panel)/content/_components/FieldsBlockEditor.tsx
// An editor for a content block made of text fields and short lists (#106):
// the home introduction, the AI guide section, the release line. The fields
// and their limits mirror the block's schema (lib/content/blocks.ts); the
// server validates again. A "json" field edits a small structured value (the
// guide's questions per page) as JSON, checked as you type. Fields a block has
// but this form doesn't show are kept, never dropped, on save.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, X } from "lucide-react";
import { adminButton, adminHint, adminInput, adminLabel } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

export type BlockField =
  | { name: string; label: string; max: number; kind: "line" | "text"; hint?: string }
  | { name: string; label: string; max: number; kind: "list"; maxItems: number }
  | { name: string; label: string; kind: "json"; hint: string };

type Body = Record<string, unknown>;

export function FieldsBlockEditor({ blockKey, fields, initial }: { blockKey: string; fields: BlockField[]; initial: Body | null }) {
  const router = useRouter();
  const empty = Object.fromEntries(fields.filter((f) => f.kind !== "json").map((f) => [f.name, f.kind === "list" ? [""] : ""])) as Body;
  const [body, setBody] = useState<Body>(initial ?? empty);
  // JSON fields keep their text while it's being typed; the body gets the parsed value.
  const [jsonText, setJsonText] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.filter((f) => f.kind === "json").map((f) => [f.name, initial?.[f.name] === undefined ? "" : JSON.stringify(initial[f.name], null, 2)])),
  );
  const [jsonError, setJsonError] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(body) !== JSON.stringify(initial);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (Object.values(jsonError).some(Boolean)) return setMessage({ ok: false, text: "Fix the JSON first." });
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
        if (f.kind === "json") {
          const text = jsonText[f.name] ?? "";
          return (
            <div key={f.name}>
              <label htmlFor={id} className={adminLabel}>{f.label}</label>
              <textarea
                id={id}
                rows={8}
                spellCheck={false}
                className={cn(adminInput, "font-mono text-xs")}
                value={text}
                aria-invalid={Boolean(jsonError[f.name])}
                onChange={(e) => {
                  const next = e.target.value;
                  setJsonText((t) => ({ ...t, [f.name]: next }));
                  if (!next.trim()) {
                    setJsonError((x) => ({ ...x, [f.name]: null }));
                    setBody((b) => Object.fromEntries(Object.entries(b).filter(([k]) => k !== f.name)));
                    return;
                  }
                  try {
                    const value: unknown = JSON.parse(next);
                    setJsonError((x) => ({ ...x, [f.name]: null }));
                    setBody((b) => ({ ...b, [f.name]: value }));
                  } catch {
                    setJsonError((x) => ({ ...x, [f.name]: "Not valid JSON yet." }));
                  }
                }}
              />
              <p className={cn(adminHint, jsonError[f.name] && "text-critical")}>{jsonError[f.name] ?? f.hint}</p>
            </div>
          );
        }
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
            <p className={adminHint}>
              {f.hint ? `${f.hint} · ` : ""}
              {value.length}/{f.max}
            </p>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!dirty || busy} className={adminButton.primary}>
          <Save aria-hidden="true" /> {busy ? "Saving…" : "Save"}
        </button>
        {dirty && initial && (
          <button
            type="button"
            onClick={() => {
              setBody(initial);
              setJsonText(Object.fromEntries(fields.filter((f) => f.kind === "json").map((f) => [f.name, initial[f.name] === undefined ? "" : JSON.stringify(initial[f.name], null, 2)])));
              setJsonError({});
            }}
            className={adminButton.ghost}
          >
            Discard
          </button>
        )}
        {message && <p role="status" className={cn("text-sm", message.ok ? "text-signal-finished" : "text-critical")}>{message.text}</p>}
      </div>
    </form>
  );
}
