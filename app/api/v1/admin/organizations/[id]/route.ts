// PATCH /api/v1/admin/organizations/{id} (#82). Organizations aren't deleted:
// systems — never deleted themselves (BR-1.9) — keep referring to them.
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { OrganizationUpdateInputSchema } from "@/lib/schemas";
import { withAdmin } from "@/lib/auth/with-admin";
import { checkViolationMessage } from "@/lib/rules/profile";
import { organizationKindData, organizationWithCount, toAdminOrganization } from "@/lib/rules/organizations";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const PATCH = withAdmin<{ id: string }>(async (request, { write }, { params }) => {
  const { id } = await params;
  const parsed = OrganizationUpdateInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid organization update", 400, { issues: parsed.error.issues });
  }
  try {
    const { kind, ...fields } = parsed.data;
    const org = await write(async (tx) => {
      const kindData = await organizationKindData(tx, kind);
      return kindData === "invalid" ? null : tx.organization.update({ where: { id }, data: { ...fields, ...kindData }, ...organizationWithCount });
    });
    if (!org) return errorResponse("VALIDATION_ERROR", `Unknown or deprecated organization kind "${kind}"`, 400);
    return NextResponse.json(toAdminOrganization(org));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return errorResponse("NOT_FOUND", "Organization not found", 404);
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return errorResponse("VALIDATION_ERROR", "That slug is taken.", 400);
    }
    const message = checkViolationMessage(err);
    if (message) return errorResponse("VALIDATION_ERROR", message, 400);
    throw err;
  }
});
