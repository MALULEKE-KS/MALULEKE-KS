// POST /api/v1/admin/systems/{id}/writeup — "Regenerate from repo" (BR-4.5).
// The owner hands the system's description and case study back to the AI and
// has them rewritten now from the public repo, without waiting for the daily
// job. Handing back is the explicit act the database requires before a
// generated write may replace the owner's words; the previous text stays in the
// revision history (BR-1.15) and can be restored. Off while writeups.enabled is
// off (BR-4.4). See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/auth/with-admin";
import { FLAGS, isFlagOn } from "@/lib/flags";
import { runSystemWriteups } from "@/lib/jobs/system-writeups";
import { getAdminSystemDetail } from "@/lib/queries/admin-systems";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, details: null } }, { status });
}

// Gathering the repo and writing takes a few seconds; more than a page request.
export const maxDuration = 120;

export const POST = withAdmin<{ id: string }>(async (_request, { write }, { params }) => {
  const { id } = await params;
  const system = await db.system.findUnique({
    where: { id },
    select: { id: true, contentStatus: true, repoPrivate: true, githubFullName: true, clientVisibility: true, clientApproved: true },
  });
  if (!system) return errorResponse("NOT_FOUND", "System not found", 404);
  if (!(await isFlagOn(FLAGS.writeups))) {
    return errorResponse("WRITEUPS_OFF", "Generated write-ups are switched off (Settings → Flags → writeups.enabled).", 409);
  }
  // The same eligibility as the job: a live system with a public repo, never client work without approval.
  if (!system.githubFullName || system.repoPrivate || system.contentStatus !== "PUBLISHED" || (system.clientVisibility !== "PUBLIC" && !system.clientApproved)) {
    return errorResponse("NOT_ELIGIBLE", "Only a published system with a public repo (and client approval, for client work) can be written from its repo.", 409);
  }

  // Hand both fields back to the AI — the text itself is untouched until the new one is written.
  await write((tx) => tx.system.update({ where: { id }, data: { descriptionSource: "generated", caseStudySource: "generated" } }));

  const result = await runSystemWriteups({ systemId: id, force: true });
  if (result.skipped) return errorResponse("WRITEUPS_UNAVAILABLE", `Not written: ${result.skipped}.`, 503);
  if (result.errors.length > 0) return errorResponse("WRITEUP_FAILED", `Not written: ${result.errors[0]!.error}`, 502);
  return NextResponse.json(await getAdminSystemDetail(id));
});
