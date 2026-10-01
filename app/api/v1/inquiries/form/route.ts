// GET /api/v1/inquiries/form — a signed, timestamped token the Let's Talk form
// fetches when it's shown and sends back with the message (the fill-time
// check, LETS-TALK-SPEC §2). Never cached: each visitor gets their own clock.

import { NextResponse } from "next/server";
import { issueFormToken } from "@/lib/inquiries/form-token";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ token: issueFormToken() }, { headers: { "Cache-Control": "no-store" } });
}
