// app/(admin)/admin/(panel)/content/_components/JsonBlockEditor.tsx
// Content blocks too nested for a form — the evidence (docs/EVIDENCE-SPEC.md)
// and the journey's chapters — edited as JSON. The same schema the server
// enforces runs here first (lib/content/json-blocks.ts), so a broken entry is
// explained before it's sent, never after.

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { adminButton, adminHint, adminInput } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { JSON_BLOCKS, type JsonBlockKey } from "@/lib/content/json-blocks";
import { cn } from "@/lib/utils";

export function JsonBlockEditor({ blockKey, initial, hint }: { blockKey: JsonBlockKey; initial: unknown; hint: React.ReactNode }) {
  const router = useRouter();
  const start = useMemo(() => JSON.stringify(initial ?? {}, null, 2), [initial]);
  const [text, setText] = useState(start);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const check = useMemo(() => {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return { ok: false as const, problems: [`Not valid JSON: ${(e as Error).message}`] };
    }
    const parsed = JSON_BLOCKS[blockKey].safeParse(json);
    if (parsed.success) return { ok: true as const, body: parsed.data };
    return { ok: false as const, problems: parsed.error.issues.slice(0, 6).map((i) => `${i.path.join(".") || "block"}: ${i.message}`) };
  }, [text, blockKey]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!check.ok) return;
    setBusy(true);
    setMessage(null);
    const res = await adminRequest(`/content/${blockKey}`, { method: "PUT", body: check.body });
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: res.message });
    setMessage({ ok: true, text: "Saved — live on the site now." });
    router.refresh();
  }

  return (
    <form onSubmit={save} noValidate className="space-y-3">
      <label htmlFor={`${blockKey}-json`} className="sr-only">
        {blockKey} block (JSON)
      </label>
      <textarea
        id={`${blockKey}-json`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        rows={22}
        className={cn(adminInput, "font-mono text-xs leading-relaxed")}
      />
      <p className={adminHint}>{hint}</p>
      {!check.ok && (
        <ul role="alert" className="text-critical list-disc space-y-0.5 pl-5 text-sm">
          {check.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!check.ok || text === start || busy} className={adminButton.primary}>
          <Save aria-hidden="true" /> {busy ? "Saving…" : "Save"}
        </button>
        {text !== start && (
          <button type="button" onClick={() => setText(start)} className={adminButton.ghost}>
            Discard
          </button>
        )}
        {message && (
          <p role="status" className={cn("text-sm", message.ok ? "text-signal-finished" : "text-critical")}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
