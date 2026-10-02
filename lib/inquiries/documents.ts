// lib/inquiries/documents.ts
// LT-8: an applicant's documents are untrusted input. PDF only — decided by
// the file's own first bytes, never its name or the browser's MIME type;
// bounded in count and total size (the platform's request limit is 4.5 MB, so
// 4 MB combined is the ceiling); the name is reduced to a safe display label;
// the same file twice is stored once. The database re-checks the PDF
// signature and size (InquiryDocument_lt_8), so no path around this exists.

import { createHash } from "node:crypto";

export interface CheckedDocument {
  fileName: string;
  byteSize: number;
  sha256: string;
  fileData: Uint8Array<ArrayBuffer>;
}

export type DocumentsCheck = { ok: true; documents: CheckedDocument[] } | { ok: false; message: string };

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/** A display name only: no path, no control or bidi characters, .pdf kept, ≤ 120 chars. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g, "")
    .replace(/[^\p{L}\p{N} ._()-]/gu, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  const stem = cleaned.replace(/\.pdf$/i, "").slice(0, 110) || "document";
  return `${stem}.pdf`;
}

export async function checkDocuments(files: File[], limits: { maxFiles: number; maxTotalBytes: number }): Promise<DocumentsCheck> {
  if (files.length === 0) return { ok: true, documents: [] };
  if (files.length > limits.maxFiles) return { ok: false, message: `Attach at most ${limits.maxFiles} files.` };
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > limits.maxTotalBytes) return { ok: false, message: `Attachments can total at most ${Math.floor(limits.maxTotalBytes / (1024 * 1024))} MB.` };

  const seen = new Set<string>();
  const documents: CheckedDocument[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < PDF_MAGIC.length || !PDF_MAGIC.every((b, i) => bytes[i] === b)) {
      return { ok: false, message: `"${safeFileName(file.name)}" isn't a PDF — only PDF files can be attached.` };
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (seen.has(sha256)) continue; // the same file twice is kept once
    seen.add(sha256);
    documents.push({ fileName: safeFileName(file.name), byteSize: bytes.length, sha256, fileData: bytes });
  }
  return { ok: true, documents };
}
