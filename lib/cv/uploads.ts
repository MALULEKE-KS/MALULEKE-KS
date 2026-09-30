// lib/cv/uploads.ts
// The owner's uploaded CV (#92) — the second CV option beside the generated one
// (BR-7.1). An upload is accepted only if its bytes really are a PDF or a Word
// document (BR-7.6): the file's name and declared type are never trusted. A new
// upload supersedes the current file of its format; nothing is deleted or
// altered (BR-7.2, enforced by the database), and an earlier version can be made
// current again.

import { createHash } from "node:crypto";
import type { Tx } from "@/lib/audit";

export type UploadFormat = "pdf" | "docx";

export class CvUploadRejected extends Error {}

const PDF_MAGIC = "%PDF-";
const ZIP_LOCAL_HEADER = 0x04034b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP_CENTRAL_DIRECTORY_ENTRY = 0x02014b50;

/** Every entry name in a ZIP's central directory, or null if it isn't a well-formed ZIP. */
function zipEntryNames(bytes: Uint8Array): string[] | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 22 || view.getUint32(0, true) !== ZIP_LOCAL_HEADER) return null;

  // The end-of-central-directory record sits in the last 22 bytes + an optional comment (≤ 64 KB).
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === ZIP_END_OF_CENTRAL_DIRECTORY) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const names: string[] = [];
  const decoder = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== ZIP_CENTRAL_DIRECTORY_ENTRY) return null;
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    if (offset + 46 + nameLength > bytes.length) return null;
    names.push(decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return names;
}

/**
 * The file's real format from its content (BR-7.6), or a reason it's refused.
 * PDF: the PDF header and an end-of-file marker. Word: a well-formed ZIP that
 * holds a WordprocessingML document — and no macros (a .docm renamed .docx).
 */
export function detectCvFormat(bytes: Uint8Array): UploadFormat {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 8));
  if (head.startsWith(PDF_MAGIC)) {
    const tail = new TextDecoder("latin1").decode(bytes.subarray(Math.max(0, bytes.length - 1024)));
    if (!tail.includes("%%EOF")) throw new CvUploadRejected("The PDF is incomplete — it has no end-of-file marker.");
    return "pdf";
  }

  const names = zipEntryNames(bytes);
  if (names) {
    if (!names.includes("[Content_Types].xml") || !names.includes("word/document.xml")) {
      throw new CvUploadRejected("The file is an archive, but not a Word document.");
    }
    if (names.some((name) => /vbaProject\.bin$/i.test(name))) {
      throw new CvUploadRejected("Word documents with macros aren't accepted.");
    }
    return "docx";
  }

  throw new CvUploadRejected("Only PDF and Word (.docx) files are accepted.");
}

/** A display-only name: no path, no control characters, bounded. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 200);
  return cleaned || "cv";
}

const versionFields = {
  id: true,
  format: true,
  fileName: true,
  byteSize: true,
  sha256: true,
  uploadedAt: true,
  supersededAt: true,
} as const;

export type CvUploadVersion = {
  id: string;
  format: string;
  fileName: string;
  byteSize: number;
  sha256: string;
  uploadedAt: Date;
  supersededAt: Date | null;
};

/** Admin wire shape of one version. */
export function toCvUploadVersion(v: CvUploadVersion) {
  return {
    id: v.id,
    format: v.format as UploadFormat,
    fileName: v.fileName,
    byteSize: v.byteSize,
    sha256: v.sha256,
    uploadedAt: v.uploadedAt.toISOString(),
    supersededAt: v.supersededAt?.toISOString() ?? null,
    current: v.supersededAt === null,
  };
}

/**
 * Store an upload as the current file of its format, superseding the previous
 * one (BR-7.2). Uploading the file that's already current changes nothing.
 */
export async function storeCvUpload(tx: Tx, bytes: Uint8Array, originalName: string) {
  const format = detectCvFormat(bytes);
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const current = await tx.cvUpload.findFirst({ where: { format, supersededAt: null }, select: versionFields });
  if (current?.sha256 === sha256) return { version: current, created: false };

  await tx.cvUpload.updateMany({ where: { format, supersededAt: null }, data: { supersededAt: new Date() } });
  const version = await tx.cvUpload.create({
    data: { format, fileName: cleanFileName(originalName), byteSize: bytes.length, sha256, fileData: Buffer.from(bytes) },
    select: versionFields,
  });
  return { version, created: true };
}

/** Make an earlier version the current file of its format again (BR-7.2). */
export async function restoreCvUpload(tx: Tx, id: string) {
  const target = await tx.cvUpload.findUnique({ where: { id }, select: versionFields });
  if (!target) return null;
  if (target.supersededAt === null) return target;

  await tx.cvUpload.updateMany({ where: { format: target.format, supersededAt: null }, data: { supersededAt: new Date() } });
  return tx.cvUpload.update({ where: { id }, data: { supersededAt: null }, select: versionFields });
}

export async function listCvUploadVersions(tx: Pick<Tx, "cvUpload">) {
  return tx.cvUpload.findMany({ select: versionFields, orderBy: [{ format: "asc" }, { uploadedAt: "desc" }] });
}
