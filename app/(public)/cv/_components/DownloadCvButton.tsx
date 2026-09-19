// app/(public)/cv/_components/DownloadCvButton.tsx
// Colocated — only used on /cv. Generates a fresh CV on click (BR-7.1 —
// never a pre-built static file) and triggers the browser download. The same
// CV comes as PDF or Word (#74).

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Format = "pdf" | "docx";

const LABEL: Record<Format, string> = { pdf: "Download PDF", docx: "Download Word" };

export function DownloadCvButton() {
  const [state, setState] = useState<{ status: "idle" | "generating" | "error"; format?: Format }>({ status: "idle" });

  async function handleDownload(format: Format) {
    setState({ status: "generating", format });
    try {
      const res = await fetch("/api/v1/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) {
        setState({ status: "error", format });
        return;
      }
      const { fileUrl } = await res.json();
      window.location.assign(fileUrl);
      setState({ status: "idle" });
    } catch {
      setState({ status: "error", format });
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(LABEL) as Format[]).map((format) => (
          <Button
            key={format}
            type="button"
            variant="outline"
            onClick={() => handleDownload(format)}
            disabled={state.status === "generating"}
          >
            {state.status === "generating" && state.format === format ? "Generating…" : LABEL[format]}
          </Button>
        ))}
      </div>
      {state.status === "error" && (
        <p className="font-mono text-xs text-critical mt-2">Could not generate the CV. Please try again.</p>
      )}
    </div>
  );
}
