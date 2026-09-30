// lib/queries/admin-systems.ts
// The admin's full view of one system (#82): the unmasked record plus what
// the database knows about it — its skills, every status change (written by
// trigger, #70), pace (SystemPace view) and weekly GitHub activity.

import { db } from "@/lib/db";
import { systemWithAdminRelations, toAdminSystem } from "@/lib/rules/publishing";
import { getSystemPace } from "@/lib/queries/evidence";

const WEEKS_OF_ACTIVITY = 52;

export async function getAdminSystemDetail(id: string) {
  const system = await db.system.findUnique({ where: { id }, ...systemWithAdminRelations });
  if (!system) return null;

  const [skills, history, [pace], activity] = await Promise.all([
    db.skillOnSystem.findMany({ where: { systemId: id }, include: { skill: true }, orderBy: { skill: { name: "asc" } } }),
    db.systemStatusChange.findMany({
      where: { systemId: id },
      include: { fromStatus: true, toStatus: true },
      orderBy: { changedAt: "asc" },
    }),
    getSystemPace([id]),
    db.systemActivityWeek.findMany({ where: { systemId: id }, orderBy: { weekStart: "desc" }, take: WEEKS_OF_ACTIVITY }),
  ]);

  const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
  return {
    ...toAdminSystem(system),
    skills: skills.map((s) => ({ id: s.skill.id, name: s.skill.name })),
    statusHistory: history.map((h) => ({
      from: h.fromStatus?.key ?? null,
      to: h.toStatus.key,
      fromStage: h.fromStage?.toLowerCase() ?? null,
      toStage: h.toStage.toLowerCase(),
      changedAt: h.changedAt.toISOString(),
      // Backfilled rows record the state when history began — not a date claim.
      backfilled: h.backfilled,
    })),
    pace: {
      buildingSince: iso(pace?.buildingSince),
      shippedAt: iso(pace?.shippedAt),
      trackedSince: iso(pace?.trackedSince),
      daysToShip: pace?.daysToShip ?? null,
    },
    activity: activity.map((a) => ({ weekStart: a.weekStart.toISOString().slice(0, 10), commits: a.commits })),
  };
}
