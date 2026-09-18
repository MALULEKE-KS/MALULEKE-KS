// app/(public)/cv/_components/DownloadCvButton.tsx
// Colocated — only used on /cv. Generates a fresh PDF on click (BR-7.1 —
// never a pre-built static file) and triggers the browser download.

"use client";

import { useState } from "react";

export function DownloadCvButton() {
  const [state, setState] = useState<"idle" | "generating" | "error">("idle");

  async function handleDownload() {
    setState("generating");
    try {
      const res = await fetch("/api/v1/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setState("error");
        return;
      }
      const { fileUrl } = await res.json();
      window.location.href = fileUrl;
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={state === "generating"}
        className="font-mono text-xs uppercase tracking-wide px-4 py-2 border border-accent text-accent hover:bg-accent/5 transition-colors disabled:opacity-50"
      >
        {state === "generating" ? "Generating…" : "Download PDF"}
      </button>
      {state === "error" && <p className="font-mono text-xs text-critical mt-2">Could not generate the PDF.</p>}
    </div>
  );
}
