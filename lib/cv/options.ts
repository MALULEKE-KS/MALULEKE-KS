// lib/cv/options.ts
// The CV options a visitor is offered (#92, BR-7.1/7.5), read only through the
// public views: PublicCvOption lists visible options, PublicCvUpload the current
// files of a visible upload option. Every CV route asks here before serving
// anything, so a hidden option is refused everywhere, not just unlisted.

import { NextResponse } from "next/server";
import { dbPublic } from "@/lib/db";

export type CvOptionKind = "generated" | "uploaded";

export async function isCvOptionOffered(kind: CvOptionKind): Promise<boolean> {
  return (await dbPublic.publicCvOption.count({ where: { kind } })) > 0;
}

/** Whether any CV is offered at all — so a link to /cv never leads to an empty page. */
export async function isAnyCvOffered(): Promise<boolean> {
  return (await dbPublic.publicCvOption.count()) > 0;
}

/** The same 404 for a hidden option as for anything that doesn't exist. */
export function cvOptionNotOffered() {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message: "This CV option isn't offered.", details: null } },
    { status: 404 },
  );
}

/** Visible options, the admin's chosen first one first (openapi CvOption). */
export async function getPublicCvOptions() {
  const [options, files] = await Promise.all([
    dbPublic.publicCvOption.findMany(),
    dbPublic.publicCvUpload.findMany({
      select: { id: true, format: true, byteSize: true, uploadedAt: true },
      orderBy: { format: "asc" },
    }),
  ]);

  return options
    .sort((a, b) => Number(b.isFirst) - Number(a.isFirst))
    .map((option) =>
      option.kind === "generated"
        ? {
            kind: "generated" as const,
            label: option.label,
            note: option.note,
            formats: option.formats,
            // Built on request from live data (BR-7.1).
            generate: { method: "POST" as const, url: "/api/v1/cv/generate" },
          }
        : {
            kind: "uploaded" as const,
            label: option.label,
            note: option.note,
            formats: option.formats,
            uploadedAt: option.uploadedAt?.toISOString() ?? null,
            files: files.map((f) => ({
              format: f.format,
              byteSize: f.byteSize,
              uploadedAt: f.uploadedAt.toISOString(),
              url: `/api/v1/cv/uploads/${f.id}`,
            })),
          },
    );
}
