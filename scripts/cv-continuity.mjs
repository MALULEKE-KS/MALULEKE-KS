// scripts/cv-continuity.mjs — Constitution §9 "continuity fallback" (#97).
// Downloads the CV the live site currently offers and saves it, so a copy can
// be hosted independently of the platform (the cv-continuity workflow
// publishes it as a GitHub release asset). It follows the admin's choice of
// CV options (GET /api/v1/cv/options, BR-7.5), in their order, preferring a
// PDF; it never builds or alters a CV itself.
//
//   SITE_URL=https://maluleke-ks.vercel.app node scripts/cv-continuity.mjs out/
//
// Exits non-zero on any failure — the workflow then leaves the last good copy.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const site = (process.env.SITE_URL || "https://maluleke-ks.vercel.app").replace(/\/+$/, "");
const outDir = process.argv[2] || "out";

async function get(url, init) {
  const res = await fetch(url, { redirect: "follow", ...init });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${url}: ${res.status} ${res.statusText}`);
  return res;
}

/** The bytes really are a PDF or a Word (ZIP) file — never an error page. */
function detect(bytes) {
  const head = Buffer.from(bytes.subarray(0, 5)).toString("latin1");
  if (head.startsWith("%PDF-")) return "pdf";
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return "docx";
  return null;
}

async function candidates() {
  const { options } = await (await get(`${site}/api/v1/cv/options`)).json();
  if (!Array.isArray(options) || options.length === 0) throw new Error("The site offers no CV options.");
  const list = [];
  for (const option of options) {
    if (option.kind === "generated") {
      for (const format of ["pdf", "docx"].filter((f) => option.formats.includes(f))) {
        list.push({ label: `generated ${format}`, format, fetchFile: async () => {
          const res = await get(`${site}/api/v1/cv/generate`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ format }),
          });
          const { fileUrl } = await res.json();
          return get(new URL(fileUrl, site).toString());
        } });
      }
    } else if (option.kind === "uploaded") {
      for (const file of option.files ?? []) {
        list.push({ label: `uploaded ${file.format}`, format: file.format, fetchFile: () => get(new URL(file.url, site).toString()) });
      }
    }
  }
  // The admin's order, but a PDF first when one is offered: it opens anywhere.
  return [...list.filter((c) => c.format === "pdf"), ...list.filter((c) => c.format !== "pdf")];
}

const list = await candidates();
let lastError;
for (const candidate of list) {
  try {
    const bytes = new Uint8Array(await (await candidate.fetchFile()).arrayBuffer());
    const format = detect(bytes);
    if (!format) throw new Error(`${candidate.label}: the response isn't a PDF or Word file`);
    await mkdir(outDir, { recursive: true });
    const file = path.join(outDir, `cv.${format}`);
    await writeFile(file, bytes);
    console.log(`Saved ${candidate.label} (${bytes.length} bytes) to ${file}`);
    process.exit(0);
  } catch (err) {
    lastError = err;
    console.warn(`Skipped ${candidate.label}: ${err instanceof Error ? err.message : err}`);
  }
}
console.error(`No CV could be downloaded: ${lastError instanceof Error ? lastError.message : lastError}`);
process.exit(1);
