// app/(admin)/admin/(panel)/profile/_components/PhotosPanel.tsx
// The owner's photos (F5c, D6; BR-1.17): upload one per purpose with a
// description for screen readers; every version is kept and can be made
// current again. The server re-encodes each upload and drops its metadata.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, ImageIcon, RotateCcw } from "lucide-react";
import { adminButton, adminHint, adminInput, adminLabel, EmptyState, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { adminRequest, toSignIn } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

export interface PhotoVersion {
  id: string;
  purpose: string;
  altText: string;
  width: number;
  height: number;
  byteSize: number;
  uploadedAt: string;
  current: boolean;
  previewUrl: string;
}

type Purpose = { key: string; label: string; description: string };

export function PhotosPanel({ versions, purposes }: { versions: PhotoVersion[]; purposes: Purpose[] }) {
  const router = useRouter();
  const [purpose, setPurpose] = useState(purposes[0]?.key ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMessage(null);
    const body = new FormData();
    body.append("file", file);
    body.append("purpose", purpose);
    body.append("altText", altText.trim());
    // Multipart, so not through adminRequest's JSON body.
    const res = await fetch("/api/v1/admin/profile/photos", { method: "POST", body }).catch(() => null);
    setBusy(false);
    if (res?.status === 401) return toSignIn();
    if (!res?.ok) {
      const payload = res ? await res.json().catch(() => null) : null;
      return setMessage({ ok: false, text: payload?.error?.message ?? "That didn't go through. Try again." });
    }
    setFile(null);
    setAltText("");
    setMessage({ ok: true, text: "Uploaded — it's the current photo now." });
    router.refresh();
  }

  async function restore(id: string) {
    setMessage(null);
    const res = await adminRequest(`/profile/photos/${id}/restore`, { method: "POST" });
    if (!res.ok) return setMessage({ ok: false, text: res.message });
    setMessage({ ok: true, text: "That version is current again." });
    router.refresh();
  }

  return (
    <Panel title="Photos" description="Your photos on the site, one current per place. Uploads are converted and stripped of hidden data (location, camera). Every version is kept (BR-1.17).">
      <form onSubmit={upload} className="mb-5 grid gap-3 rounded-xl border border-dashed border-ink/15 p-4 md:grid-cols-[12rem_minmax(0,1fr)]">
        <div>
          <label htmlFor="ph-purpose" className={adminLabel}>Where</label>
          <select id="ph-purpose" className={adminInput} value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            {purposes.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <p className={adminHint}>{purposes.find((p) => p.key === purpose)?.description}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="ph-alt" className={adminLabel}>What it shows</label>
            <input id="ph-alt" maxLength={300} className={adminInput} value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Portrait of … against a dark studio backdrop" />
            <p className={adminHint}>Read aloud to people using screen readers.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className={cn(adminButton.secondary, "cursor-pointer")}>
              <FileUp aria-hidden="true" /> {file ? file.name : "Choose a photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <button type="submit" disabled={!file || !altText.trim() || busy} className={adminButton.dark}>{busy ? "Uploading…" : "Upload"}</button>
          </div>
        </div>
      </form>
      {message && <p role="status" className={cn("mb-3 text-sm", message.ok ? "text-signal-finished" : "text-critical")}>{message.text}</p>}
      {versions.length === 0 ? (
        <EmptyState icon={ImageIcon}>No photos yet.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {versions.map((v) => (
            <li key={v.id} className={cn("overflow-hidden rounded-xl border bg-paper", v.current ? "border-ember/40" : "border-ink/10")}>
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a private version; next/image would need the route to be public */}
              <img src={v.previewUrl} alt={v.altText} width={v.width} height={v.height} loading="lazy" className="aspect-[4/5] w-full bg-night-deep object-cover" />
              <div className="space-y-1.5 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <Pill tone={v.current ? "good" : "neutral"}>{v.current ? "current" : "earlier"}</Pill>
                  <span className="text-slate">{purposes.find((p) => p.key === v.purpose)?.label ?? v.purpose}</span>
                </div>
                <p className="line-clamp-2 text-ink">{v.altText}</p>
                <p className="text-slate">{v.width}×{v.height} · {Math.round(v.byteSize / 1024)} KB · {formatWhen(v.uploadedAt)}</p>
                {!v.current && (
                  <button type="button" onClick={() => restore(v.id)} className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
                    <RotateCcw aria-hidden="true" className="size-3.5" /> Make current
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
