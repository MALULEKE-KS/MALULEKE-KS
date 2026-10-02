// app/(public)/contact/_components/DocumentsSection.tsx
// Let's Talk — PDFs only (LT-8): checked here for guidance and again by their
// bytes on the server. Drop them on the box or choose them.

"use client";

import { useState } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { FORM_SHAPE } from "@/lib/inquiries/fields";
import { cn } from "@/lib/utils";
import { ErrorText, Section } from "./fields";
import type { InquiryForm } from "./use-inquiry-form";

export function DocumentsSection({ f, uid, step, maxFiles, maxMegabytes }: { f: InquiryForm; uid: string; step: number; maxFiles: number; maxMegabytes: number }) {
  const [over, setOver] = useState(false);
  if (maxFiles <= 0) return null;
  return (
    <Section id="part-documents" step={step} title="Documents" done={f.files.length > 0}>
      <label
        htmlFor={`${uid}-docs`}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          f.addFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn("hover:border-ember/60 focus-within:border-ember flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-5 py-5 transition-colors", over ? "border-ember bg-ember/5" : "border-ink/20")}
      >
        <span className="bg-ink/[0.05] text-ink grid size-10 shrink-0 place-items-center rounded-xl">
          <Paperclip aria-hidden="true" className="size-5" />
        </span>
        <span className="text-sm">
          <span className="text-ink block font-medium">Attach PDFs — {FORM_SHAPE[f.form].documentsHint}</span>
          <span className="text-slate">
            Drop them here or choose. Up to {maxFiles}, {maxMegabytes} MB in total. Optional.
          </span>
        </span>
        <input
          id={`${uid}-docs`}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          onChange={(e) => {
            f.addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>
      <ErrorText>{f.errors.documents}</ErrorText>
      {f.files.length > 0 && (
        <ul className="space-y-2">
          {f.files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="border-ink/10 bg-paper flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
              <FileText aria-hidden="true" className="text-accent size-4 shrink-0" />
              <span className="text-ink min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-slate text-xs">{Math.ceil(file.size / 1024)} KB</span>
              <button type="button" onClick={() => f.removeFile(i)} className="text-slate hover:text-ink rounded-full p-1" aria-label={`Remove ${file.name}`}>
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
