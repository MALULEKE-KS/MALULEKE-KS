// PATCH /api/v1/admin/settings/platform/{key} — change one tunable (#67).
// Validated against the setting's registered type and bounds before it's
// stored; the database audits the change, attributed to the admin (F2.1).
// See openapi-contract.yaml.

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/with-admin";
import { PlatformSettingUpdateInputSchema } from "@/lib/schemas";
import { listSettings, updateSetting } from "@/lib/settings";
import { isSettingKey } from "@/lib/settings/registry";

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export const PATCH = withAdmin<{ key: string }>(async (request, { write }, { params }) => {
  const { key } = await params;
  if (!isSettingKey(key)) return errorResponse("NOT_FOUND", `Unknown setting "${key}"`, 404);

  const body = PlatformSettingUpdateInputSchema.safeParse(await request.json().catch(() => null));
  if (!body.success || body.data.value === undefined) {
    return errorResponse("VALIDATION_ERROR", "Body must be { value }", 400);
  }

  const result = await write((tx) => updateSetting(tx, key, body.data.value));
  if (!result.ok) {
    return errorResponse("VALIDATION_ERROR", `Invalid value for ${key}`, 400, { issues: result.issues });
  }

  const updated = (await listSettings()).find((s) => s.key === key);
  return NextResponse.json(updated);
});
