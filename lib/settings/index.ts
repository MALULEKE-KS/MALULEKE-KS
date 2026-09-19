// lib/settings/index.ts
// Read and write platform settings (#67). Reads never throw on bad data: a
// missing or invalid row yields the registry default, so a setting can't take
// the site down. Writes are validated against the registry before they touch
// the database.

import { db } from "@/lib/db";
import { SETTINGS, SETTING_KEYS, type SettingKey, type SettingValue } from "@/lib/settings/registry";

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const def = SETTINGS[key];
  const row = await db.platformSetting.findUnique({ where: { key } });
  if (!row) return def.default as SettingValue<K>;
  const parsed = def.schema.safeParse(row.value);
  return (parsed.success ? parsed.data : def.default) as SettingValue<K>;
}

export interface SettingView {
  key: SettingKey;
  value: unknown;
  default: unknown;
  isDefault: boolean;
  description: string;
  rule: string;
  updatedAt: string | null;
}

/** Every registered setting with its effective value — for the admin screen. */
export async function listSettings(): Promise<SettingView[]> {
  const rows = await db.platformSetting.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return SETTING_KEYS.map((key) => {
    const def = SETTINGS[key];
    const row = byKey.get(key);
    const parsed = row ? def.schema.safeParse(row.value) : null;
    const effective = parsed?.success ? parsed.data : def.default;
    return {
      key,
      value: effective,
      default: def.default,
      isDefault: !parsed?.success,
      description: def.description,
      rule: def.rule,
      updatedAt: parsed?.success && row ? row.updatedAt.toISOString() : null,
    };
  });
}

export type UpdateSettingResult =
  | { ok: true; before: unknown; after: unknown }
  | { ok: false; issues: unknown };

/** Validate against the registry, then upsert. */
export async function updateSetting(key: SettingKey, value: unknown): Promise<UpdateSettingResult> {
  const def = SETTINGS[key];
  const parsed = def.schema.safeParse(value);
  if (!parsed.success) return { ok: false, issues: parsed.error.issues };
  const before = await getSetting(key);
  await db.platformSetting.upsert({
    where: { key },
    create: { key, value: parsed.data as never },
    update: { value: parsed.data as never },
  });
  return { ok: true, before, after: parsed.data };
}
