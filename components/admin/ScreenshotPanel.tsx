// components/admin/ScreenshotPanel.tsx
// A system's screenshot in the admin (BR-1.18): the current image — it is also
// the hero image of the system's case study (D-054) — where it came from, and the
// three actions: Upload your own (it wins over automatic captures), Capture now
// from the live site, and Back to automatic. Every version is kept in the history
// below: make an earlier one current again, or — only on purpose, never the
// current one — delete it for good (BR-1.18 as amended).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageUp, RotateCcw } from "lucide-react";
import { adminButton, adminHint, formatWhen, Panel } from "@/components/admin/ui";
import { adminRequest, toSignIn } from "@/lib/admin/request";
import { cn } from "@/lib/utils";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";

interface Version {
  id: string;
  source: string;
  sourceUrl: string | null;
  width: number;
  height: number;
  byteSize: number;
  createdAt: string;
  current: boolean;
}

export interface ScreenshotInfo {
  source: string;
  sourceUrl: string | null;
  width: number;
  height: number;
  sha256: string;
  createdAt: string;
}

export function ScreenshotPanel({ systemId, liveUrl, screenshot }: { systemId: string; liveUrl: string | null; screenshot: ScreenshotInfo | null }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "upload" | "capture" | "auto">(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const uploaded = screenshot?.source === "upload";
  const [versions, setVersions] = useState<Version[]>([]);

  const loadVersions = useCallback(async () => {
    const res = await adminRequest<{ data: Version[] }>(`/systems/${systemId}/screenshot/versions`);
    if (res.ok) setVersions(res.data.data);
  }, [systemId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading the history once the panel is on screen
    void loadVersions();
  }, [loadVersions, screenshot?.sha256]);

  async function versionAction(id: string, kind: "restore" | "delete") {
    setMessage(null);
    const res =
      kind === "restore"
        ? await adminRequest(`/systems/${systemId}/screenshot/versions/${id}/restore`, { method: "POST" })
        : await adminRequest(`/systems/${systemId}/screenshot/versions/${id}`, { method: "DELETE", body: { confirm: true } });
    if (!res.ok) return setMessage({ ok: false, text: res.message });
    setMessage({ ok: true, text: kind === "restore" ? "That version is the screenshot again." : "That version is deleted for good." });
    await loadVersions();
    router.refresh();
  }
  const earlier = versions.filter((v) => !v.current);

  async function upload(picked: File) {
    setBusy("upload");
    setMessage(null);
    const body = new FormData();
    body.append("file", picked);
    // Multipart, so not through adminRequest's JSON body.
    const res = await fetch(`/api/v1/admin/systems/${systemId}/screenshot`, { method: "POST", body }).catch(() => null);
    setBusy(null);
    if (file.current) file.current.value = "";
    if (res?.status === 401) return toSignIn();
    if (!res?.ok) {
      const payload = res ? await res.json().catch(() => null) : null;
      return setMessage({ ok: false, text: payload?.error?.message ?? "That didn't go through. Try again." });
    }
    setMessage({ ok: true, text: "Uploaded — it's the screenshot now, and automatic captures leave it alone." });
    router.refresh();
  }

  async function act(kind: "capture" | "auto") {
    setBusy(kind);
    setMessage(null);
    const res = await adminRequest(`/systems/${systemId}/screenshot/${kind === "capture" ? "capture" : "automatic"}`, { method: "POST" });
    setBusy(null);
    if (!res.ok) return setMessage({ ok: false, text: res.message });
    setMessage({ ok: true, text: kind === "capture" ? "Captured from the live site." : "Back to automatic — the next capture takes over." });
    router.refresh();
  }

  return (
    <Panel id="sys-screenshot" title="Screenshot" description="The hero image of the case study, and the picture on the home page and the catalogue. Captured from the live site automatically, or your own upload — which always wins. Replacing it keeps the old version below (BR-1.18).">
      <div className="overflow-hidden rounded-xl border border-ink/10 bg-paper">
        {screenshot ? (
          // eslint-disable-next-line @next/next/no-img-element -- the admin's own preview route, not a static asset
          <img src={`/api/v1/admin/systems/${systemId}/screenshot?v=${screenshot.sha256.slice(0, 12)}`} alt="The current screenshot" width={screenshot.width} height={screenshot.height} className="block h-auto w-full" />
        ) : (
          <p className="text-slate p-6 text-center text-sm">No screenshot yet{liveUrl ? " — the daily job captures the live site, or capture it now." : " — upload one, or add a live address to capture."}</p>
        )}
      </div>
      {screenshot && (
        <p className={cn(adminHint, "mt-2")}>
          {uploaded ? "Your upload" : `Captured from ${screenshot.sourceUrl?.replace(/^https?:\/\//, "") ?? "the live site"}`} · {formatWhen(screenshot.createdAt)} · {screenshot.width}×{screenshot.height}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <input ref={file} id={`shot-${systemId}`} type="file" tabIndex={-1} aria-label="Upload a screenshot" accept="image/png,image/jpeg,image/webp,image/avif" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <button type="button" disabled={busy !== null} onClick={() => file.current?.click()} className={adminButton.secondary}>
          <ImageUp aria-hidden="true" /> {busy === "upload" ? "Uploading…" : "Upload"}
        </button>
        <button type="button" disabled={busy !== null || !liveUrl} onClick={() => act("capture")} className={adminButton.secondary} title={liveUrl ? undefined : "Add the live address first"}>
          <Camera aria-hidden="true" /> {busy === "capture" ? "Capturing…" : "Capture now"}
        </button>
        {uploaded && (
          <button type="button" disabled={busy !== null} onClick={() => act("auto")} className={adminButton.ghost}>
            <RotateCcw aria-hidden="true" /> {busy === "auto" ? "Switching…" : "Back to automatic"}
          </button>
        )}
      </div>
      {message && (
        <p role="status" className={cn("mt-3 text-sm", message.ok ? "text-signal-finished" : "text-critical")}>
          {message.text}
        </p>
      )}

      {earlier.length > 0 && (
        <div className="mt-6">
          <p className="text-ink text-sm font-medium">Earlier versions</p>
          <p className={adminHint}>Kept when the screenshot was replaced. Make one current again, or delete it for good.</p>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {earlier.map((v) => (
              <li key={v.id} className="border-ink/10 bg-paper overflow-hidden rounded-xl border">
                {/* eslint-disable-next-line @next/next/no-img-element -- the admin's own preview route */}
                <img src={`/api/v1/admin/systems/${systemId}/screenshot/versions/${v.id}`} alt="" width={v.width} height={v.height} loading="lazy" className="bg-night-deep block aspect-[16/10] w-full object-cover object-top" />
                <div className="space-y-1.5 p-3 text-xs">
                  <p className="text-slate">
                    {v.source === "upload" ? "Your upload" : "Captured"} · {formatWhen(v.createdAt)} · {Math.round(v.byteSize / 1024)} KB
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <button type="button" onClick={() => versionAction(v.id, "restore")} className="text-accent inline-flex items-center gap-1 font-medium hover:underline">
                      <RotateCcw aria-hidden="true" className="size-3.5" /> Make current
                    </button>
                    <ConfirmDelete onConfirm={() => versionAction(v.id, "delete")} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
