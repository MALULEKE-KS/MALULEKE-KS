// GET/POST /api/v1/admin/systems — full list incl. drafts/NDA; create applies
// BR-1.2 default (clientVisibility=REQUIRES_APPROVAL for isClient orgs).
// See openapi-contract.yaml. security: adminSession (BR-3.1), enforced by proxy.ts.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SystemCreateInputSchema } from "@/lib/schemas";
import { defaultClientVisibility, systemWithAdminRelations, toAdminSystem } from "@/lib/rules/publishing";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const contentStatus = searchParams.get("contentStatus");
  const needsCurationParam = searchParams.get("needsCuration");

  const systems = await db.system.findMany({
    where: {
      ...(contentStatus && { contentStatus: contentStatus.toUpperCase() as "DRAFT" | "PUBLISHED" | "ARCHIVED" }),
      ...(needsCurationParam !== null && { needsCuration: needsCurationParam === "true" }),
    },
    ...systemWithAdminRelations,
    orderBy: [{ needsCuration: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ data: systems.map(toAdminSystem) });
}

export async function POST(request: NextRequest) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const body = await request.json().catch(() => null);
  const parsed = SystemCreateInputSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid system data", 400, { issues: parsed.error.issues });
  }

  const organization = await db.organization.findUnique({ where: { id: parsed.data.organizationId } });
  if (!organization) {
    return errorResponse("VALIDATION_ERROR", "Unknown organizationId", 400);
  }

  const system = await db.system.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      organizationId: parsed.data.organizationId,
      statusId: parsed.data.statusId,
      domainId: parsed.data.domainId ?? null,
      description: parsed.data.description,
      repoUrl: parsed.data.repoUrl ?? null,
      liveUrl: parsed.data.liveUrl ?? null,
      techStack: parsed.data.techStack,
      // BR-1.2 — never trusts the request body's clientVisibility directly
      // when the org is a client.
      clientVisibility: defaultClientVisibility(organization.isClient, parsed.data.clientVisibility),
    },
    ...systemWithAdminRelations,
  });

  await logActivity({
    adminUserId,
    action: "system.create",
    entityType: "System",
    entityId: system.id,
    after: { name: system.name, slug: system.slug },
  });

  return NextResponse.json(toAdminSystem(system), { status: 201 });
}
