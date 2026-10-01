// POST /api/v1/admin/systems/{id}/screenshot/capture — "Capture now" (BR-1.18):
// take the system's screenshot from its live site right away. If the owner's
// upload is current, capturing is the explicit act that retires it (the
// previous versions stay). 409 NO_LIVE_SITE when the system has no live
// address; 502 CAPTURE_FAILED when the site or the screenshot service fails —
// nothing changes then. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { db } from "@/lib/db";
import { liveSite } from "@/lib/jobs/github-sync";
import { backToAutomatic, captureSite, currentScreenshot, ScreenshotFailed, storeScreenshot } from "@/lib/systems/screenshots";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, details: null } }, { status });
}

// Rendering a site takes a few seconds.
export const maxDuration = 60;

export const POST = withAdmin<{ id: string }>(async (_request, { write }, { params }) => {
  const { id } = await params;
  const system = await db.system.findUnique({ where: { id }, select: { liveUrl: true, clientVisibility: true } });
  if (!system) return errorResponse("NOT_FOUND", "System not found", 404);
  const url = liveSite(system.liveUrl);
  if (!url) return errorResponse("NO_LIVE_SITE", "This system has no live site to capture — add its live address, or upload a screenshot.", 409);

  let img;
  try {
    img = await captureSite(url);
  } catch (err) {
    if (err instanceof ScreenshotFailed) return errorResponse("CAPTURE_FAILED", err.message, 502);
    throw err;
  }
  await write(async (tx) => {
    await backToAutomatic(tx, id);
    await storeScreenshot(tx, id, "auto", url, img);
  });
  return NextResponse.json({ screenshot: await currentScreenshot(id) });
});
