// GET /api/v1/inquiries/types — the Let's Talk choices (LETS-TALK-SPEC LT-1):
// each active category with its description, the form it uses, and its
// active subtypes, in the admin's order. What the form's first step shows.

import { NextResponse } from "next/server";
import { getInquiryTypes } from "@/lib/queries/site";

export async function GET() {
  return NextResponse.json(await getInquiryTypes());
}
