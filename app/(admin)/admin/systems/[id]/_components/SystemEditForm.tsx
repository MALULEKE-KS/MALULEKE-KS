// app/(admin)/admin/systems/[id]/_components/SystemEditForm.tsx
// Colocated — only used on this route. The publish option is disabled with
// an inline reason (not a silent 409) when BR-1.1 would block it — updates
// live as the admin toggles "Client approved", not just on submit.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SystemEditFormProps {
  system: {
    id: string;
    contentStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    clientVisibility: "PUBLIC" | "REQUIRES_APPROVAL" | "NDA_RESTRICTED" | "ANONYMIZED_ONLY";
    clientApproved: boolean;
    isFlagship: boolean;
    sortOrder: number;
    caseStudyBody: string;
    repoUrl: string | null;
    liveUrl: string | null;
    screenshotUrl: string | null;
  };
}

// Empty input -> null (clears the field); a real value is sent as-is and
// validated server-side (SystemUpdateInputSchema requires a valid URL when
// not null).
function urlOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function SystemEditForm({ system }: SystemEditFormProps) {
  const router = useRouter();
  const [contentStatus, setContentStatus] = useState(system.contentStatus.toLowerCase());
  const [clientApproved, setClientApproved] = useState(system.clientApproved);
  const [isFlagship, setIsFlagship] = useState(system.isFlagship);
  const [sortOrder, setSortOrder] = useState(system.sortOrder);
  const [caseStudyBody, setCaseStudyBody] = useState(system.caseStudyBody);
  const [repoUrl, setRepoUrl] = useState(system.repoUrl ?? "");
  const [liveUrl, setLiveUrl] = useState(system.liveUrl ?? "");
  const [screenshotUrl, setScreenshotUrl] = useState(system.screenshotUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // BR-1.1, mirrored client-side for immediate feedback — the server is
  // still the real enforcement point (BR-1.1's own "never client-side-only"
  // rule), this is UI guidance, not a substitute for the 409 check.
  const canPublish = system.clientVisibility === "PUBLIC" || clientApproved;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/v1/admin/systems/${system.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentStatus,
          clientApproved,
          isFlagship,
          sortOrder,
          caseStudyBody,
          repoUrl: urlOrNull(repoUrl),
          liveUrl: urlOrNull(liveUrl),
          screenshotUrl: urlOrNull(screenshotUrl),
        }),
      });

      if (res.status === 409) {
        setError("Publishing requires client approval — confirm and toggle Client Approved first.");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Try again.");
        return;
      }

      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="contentStatus" className="font-sans text-sm text-ink block mb-1">
          Content status
        </label>
        <select
          id="contentStatus"
          value={contentStatus}
          onChange={(e) => setContentStatus(e.target.value)}
          className="border-b border-slate/30 bg-transparent px-0 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
        >
          <option value="draft">Draft</option>
          <option value="published" disabled={!canPublish}>
            Published{!canPublish ? " (requires client approval)" : ""}
          </option>
          <option value="archived">Archived</option>
        </select>
        {!canPublish && (
          <p className="font-mono text-xs text-critical mt-1">
            Publishing requires client approval — confirm and toggle Client Approved first.
          </p>
        )}
      </div>

      <label className="flex items-center gap-2 font-sans text-sm text-ink">
        <input
          type="checkbox"
          checked={clientApproved}
          onChange={(e) => setClientApproved(e.target.checked)}
        />
        Client approved
      </label>

      <label className="flex items-center gap-2 font-sans text-sm text-ink">
        <input type="checkbox" checked={isFlagship} onChange={(e) => setIsFlagship(e.target.checked)} />
        Flagship
      </label>

      <div>
        <label htmlFor="sortOrder" className="font-sans text-sm text-ink block mb-1">
          Sort order
        </label>
        <input
          id="sortOrder"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          className="border-b border-slate/30 bg-transparent px-0 py-2 font-mono text-sm text-ink outline-none focus:border-accent w-24"
        />
      </div>

      <div>
        <label htmlFor="liveUrl" className="font-sans text-sm text-ink block mb-1">
          Live URL
        </label>
        <input
          id="liveUrl"
          type="url"
          value={liveUrl}
          onChange={(e) => setLiveUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full border-b border-slate/30 bg-transparent px-0 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
        />
      </div>

      <div>
        <label htmlFor="repoUrl" className="font-sans text-sm text-ink block mb-1">
          Repository URL
        </label>
        <input
          id="repoUrl"
          type="url"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/org/repo"
          className="w-full border-b border-slate/30 bg-transparent px-0 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
        />
      </div>

      <div>
        <label htmlFor="screenshotUrl" className="font-sans text-sm text-ink block mb-1">
          Screenshot URL
        </label>
        <input
          id="screenshotUrl"
          type="url"
          value={screenshotUrl}
          onChange={(e) => setScreenshotUrl(e.target.value)}
          placeholder="https://.../homepage-screenshot.png"
          className="w-full border-b border-slate/30 bg-transparent px-0 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
        />
        <p className="font-mono text-xs text-slate mt-1">
          Left blank, the public case study shows a technical placeholder instead.
        </p>
      </div>

      <div>
        <label htmlFor="caseStudyBody" className="font-sans text-sm text-ink block mb-1">
          Case study body
        </label>
        <textarea
          id="caseStudyBody"
          rows={8}
          value={caseStudyBody}
          onChange={(e) => setCaseStudyBody(e.target.value)}
          className="w-full border border-slate/30 bg-transparent px-3 py-2 font-serif text-sm text-ink outline-none focus:border-accent"
        />
      </div>

      {error && <p className="font-sans text-sm text-critical">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="font-sans text-sm font-medium bg-ink text-paper px-6 py-2.5 transition-colors hover:bg-ink/85 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
