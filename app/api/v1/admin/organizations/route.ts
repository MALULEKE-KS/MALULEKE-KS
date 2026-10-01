// GET/POST /api/v1/admin/organizations — the organizations systems belong to
// (#82): founded ventures, clients, the owner's own. isClient drives BR-1.2
// for systems created afterwards, never retroactively. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { OrganizationInputSchema } from "@/lib/schemas";
import { withAdmin } from "@/lib/auth/with-admin";
import { checkViolationMessage } from "@/lib/rules/profile";
import { organizationKindData, organizationWithCount, toAdminOrganization } from "@/lib/rules/organizations";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const GET = withAdmin(async () => {
  const orgs = await db.organization.findMany({ ...organizationWithCount, orderBy: { name: "asc" } });
  return NextResponse.json({ data: orgs.map(toAdminOrganization) });
});

export const POST = withAdmin(async (request, { write }) => {
  const parsed = OrganizationInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid organization", 400, { issues: parsed.error.issues });
  }
  try {
    const { kind, ...fields } = parsed.data;
    const org = await write(async (tx) => {
      const kindData = await organizationKindData(tx, kind);
      return kindData === "invalid" ? null : tx.organization.create({ data: { ...fields, ...kindData }, ...organizationWithCount });
    });
    if (!org) return errorResponse("VALIDATION_ERROR", `Unknown or deprecated organization kind "${kind}"`, 400);
    return NextResponse.json(toAdminOrganization(org), { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return errorResponse("VALIDATION_ERROR", `The slug "${parsed.data.slug}" is taken.`, 400);
    }
    const message = checkViolationMessage(err);
    if (message) return errorResponse("VALIDATION_ERROR", message, 400);
    throw err;
  }
});
