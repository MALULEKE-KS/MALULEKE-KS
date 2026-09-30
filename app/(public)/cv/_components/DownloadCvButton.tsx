// app/(public)/cv/_components/DownloadCvButton.tsx
// Colocated — only used on /cv. The CV options the admin shows (#92, BR-7.5),
// in the admin's order, each clearly labelled (BR-7.1): the generated CV is
// built fresh from live data on click (PDF or Word, #74); the uploaded CV is
// the owner's own file, shown with its upload date. Layout and styling are
// finalised with the /cv page in F5.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Format = "pdf" | "docx";

const FORMAT_LABEL: Record<Format, string> = { pdf: "PDF", docx: "Word" };

export type CvOption =
  | { kind: "generated"; label: string; note: string; formats: string[] }
  | {
      kind: "uploaded";
      label: string;
      note: string;
      uploadedAt: string | null;
      files: { format: string; url: string }[];
    };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function DownloadCvButton({ options }: { options: CvOption[] }) {
  const [state, setState] = useState<{ status: "idle" | "generating" | "error"; format?: Format }>({ status: "idle" });

  async function generate(format: Format) {
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
    <div className="space-y-4">
      {options.map((option) => (
        <div key={option.kind}>
          <p className="text-ink font-sans text-sm font-medium">{option.label}</p>
          <p className="text-slate mb-2 font-mono text-xs">
            {option.note}
            {option.kind === "uploaded" && option.uploadedAt && ` Uploaded ${formatDate(option.uploadedAt)}.`}
          </p>
          <div className="flex flex-wrap gap-2">
            {option.kind === "generated"
              ? (option.formats as Format[]).map((format) => (
                  <Button
                    key={format}
                    type="button"
                    variant="outline"
                    onClick={() => generate(format)}
                    disabled={state.status === "generating"}
                  >
                    {state.status === "generating" && state.format === format ? "Generating…" : `Download ${FORMAT_LABEL[format]}`}
                  </Button>
                ))
              : option.files.map((file) => (
                  <Button key={file.url} asChild variant="outline">
                    <a href={file.url} download>
                      Download {FORMAT_LABEL[file.format as Format] ?? file.format.toUpperCase()}
                    </a>
                  </Button>
                ))}
          </div>
        </div>
      ))}
      {state.status === "error" && (
        <p className="font-mono text-xs text-critical">Could not generate the CV. Please try again.</p>
      )}
    </div>
  );
}
