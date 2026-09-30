// app/(public)/cv/_components/DownloadCvButton.tsx
// Colocated — only used on /cv. The CV options the admin shows (#92, BR-7.5),
// in the admin's order, each clearly labelled (BR-7.1): the generated CV is
// built fresh from live data on click (PDF or Word, #74); the uploaded CV is
// the owner's own file, shown with its upload date. v3 card (#99).

"use client";

import { useState } from "react";
import { Download, FileText, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const BUTTON =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-[transform,box-shadow,background-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-60 motion-safe:hover:-translate-y-0.5";

export function DownloadCvButton({ options }: { options: CvOption[] }) {
  const [state, setState] = useState<{ status: "idle" | "generating" | "error"; format?: Format }>({
    status: "idle",
  });

  async function generate(format: Format) {
    setState({ status: "generating", format });
    try {
      const res = await fetch("/api/v1/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) return setState({ status: "error", format });
      const { fileUrl } = await res.json();
      window.location.assign(fileUrl);
      setState({ status: "idle" });
    } catch {
      setState({ status: "error", format });
    }
  }

  if (options.length === 0) return null;

  return (
    <div className="space-y-4">
      {options.map((option, i) => (
        <div
          key={option.kind}
          className={cn(
            "rounded-2xl border p-5",
            i === 0
              ? "bg-night text-paper shadow-lift border-white/10"
              : "border-ink/10 bg-sheet text-ink shadow-soft"
          )}
        >
          <p className="inline-flex items-center gap-2 font-sans font-semibold">
            {option.kind === "generated" ? (
              <Sparkles
                aria-hidden="true"
                className={cn("size-4", i === 0 ? "text-ember" : "text-accent")}
              />
            ) : (
              <FileText
                aria-hidden="true"
                className={cn("size-4", i === 0 ? "text-ember" : "text-accent")}
              />
            )}
            {option.label}
          </p>
          <p className={cn("mt-1.5 text-sm leading-relaxed", i === 0 ? "text-mist" : "text-slate")}>
            {option.note}
            {option.kind === "uploaded" &&
              option.uploadedAt &&
              ` Uploaded ${formatDate(option.uploadedAt)}.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {option.kind === "generated"
              ? (option.formats as Format[]).map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => generate(format)}
                    disabled={state.status === "generating"}
                    className={cn(
                      BUTTON,
                      i === 0 && format === "pdf"
                        ? "bg-ember text-ink shadow-glow-ember"
                        : i === 0
                          ? "text-paper border border-white/15 bg-white/5"
                          : "border-ink/15 bg-paper text-ink border"
                    )}
                  >
                    {state.status === "generating" && state.format === format ? (
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                    ) : (
                      <Download aria-hidden="true" className="size-4" />
                    )}
                    {state.status === "generating" && state.format === format
                      ? "Building…"
                      : FORMAT_LABEL[format]}
                  </button>
                ))
              : option.files.map((file) => (
                  <a
                    key={file.url}
                    href={file.url}
                    download
                    className={cn(
                      BUTTON,
                      i === 0 && file.format === "pdf"
                        ? "bg-ember text-ink shadow-glow-ember"
                        : i === 0
                          ? "text-paper border border-white/15 bg-white/5"
                          : "border-ink/15 bg-paper text-ink border"
                    )}
                  >
                    <Download aria-hidden="true" className="size-4" />
                    {FORMAT_LABEL[file.format as Format] ?? file.format.toUpperCase()}
                  </a>
                ))}
          </div>
        </div>
      ))}
      {state.status === "error" && (
        <p role="alert" className="text-critical text-sm">
          Could not build the CV. Please try again.
        </p>
      )}
    </div>
  );
}
