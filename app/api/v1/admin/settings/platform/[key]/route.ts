// PATCH /api/v1/admin/settings/platform/{key} — change one tunable (#67).
// Validated against the setting's registered type and bounds before it's
// stored; every change is audited with before/after. See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { getSessionAdminId } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/activity-log";
import { PlatformSettingUpdateInputSchema } from "@/lib/schemas";
import { listSettings, updateSetting } from "@/lib/settings";
import { isSettingKey } from "@/lib/settings/registry";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const adminUserId = await getSessionAdminId(request);
  if (!adminUserId) return errorResponse("UNAUTHORIZED", "Session expired or invalid.", 401);

  const { key } = await params;
  if (!isSettingKey(key)) return errorResponse("NOT_FOUND", `Unknown setting "${key}"`, 404);

  const body = PlatformSettingUpdateInputSchema.safeParse(await request.json().catch(() => null));
  if (!body.success || body.data.value === undefined) {
    return errorResponse("VALIDATION_ERROR", "Body must be { value }", 400);
  }

  const result = await updateSetting(key, body.data.value);
  if (!result.ok) {
    return errorResponse("VALIDATION_ERROR", `Invalid value for ${key}`, 400, { issues: result.issues });
  }

  await logActivity({
    adminUserId,
    action: "setting.update",
    entityType: "PlatformSetting",
    entityId: key,
    before: { value: result.before },
    after: { value: result.after },
    request,
  });

  const updated = (await listSettings()).find((s) => s.key === key);
  return NextResponse.json(updated);
}
