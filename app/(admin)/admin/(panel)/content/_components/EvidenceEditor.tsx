// app/(admin)/admin/(panel)/content/_components/EvidenceEditor.tsx
// The evidence block (docs/EVIDENCE-SPEC.md) edited as JSON: claims nest
// links, so a form would be a page of its own — the admin isn't this phase's
// focus (spec §11). The same schema the server enforces runs here first, so
// a broken entry is explained before it's sent, never after.

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { adminButton, adminHint, adminInput } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { EvidenceBlock } from "@/lib/evidence/schema";
import { cn } from "@/lib/utils";

export function EvidenceEditor({ initial }: { initial: unknown }) {
  const router = useRouter();
  const start = useMemo(() => JSON.stringify(initial ?? { claims: [] }, null, 2), [initial]);
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
    const parsed = EvidenceBlock.safeParse(json);
    if (parsed.success) return { ok: true as const, body: parsed.data };
    return { ok: false as const, problems: parsed.error.issues.slice(0, 6).map((i) => `${i.path.join(".") || "block"}: ${i.message}`) };
  }, [text]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!check.ok) return;
    setBusy(true);
    setMessage(null);
    const res = await adminRequest("/content/evidence", { method: "PUT", body: check.body });
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: res.message });
    setMessage({ ok: true, text: "Saved — live on the site now." });
    router.refresh();
  }

  return (
    <form onSubmit={save} noValidate className="space-y-3">
      <label htmlFor="evidence-json" className="sr-only">
        Evidence block (JSON)
      </label>
      <textarea
        id="evidence-json"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        rows={22}
        className={cn(adminInput, "font-mono text-xs leading-relaxed")}
      />
      <p className={adminHint}>
        Each claim: id, claim, where (principle:&lt;name&gt;, pulse:&lt;key&gt; or system:&lt;slug&gt;), status (verified, partial, planned), proves, doesNotProve, 1–6 evidence links, reviewedAt (YYYY-MM-DD). Links: repo:&lt;path&gt;, /public-route or actions:&lt;workflow&gt;.yml. A verified claim shows &ldquo;Review due&rdquo; on its own once its review is older than the evidence.reviewDays setting.
      </p>
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
