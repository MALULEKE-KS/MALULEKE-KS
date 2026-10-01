// app/(admin)/admin/(panel)/profile/page.tsx
// The owner's details as data (#105): the profile that fills the site's
// header, footer, about page and CV; the links beside it; and achievements
// (drafts until published, schedulable — BR-1.13). Nothing about the owner
// lives in code.

import { UserRound } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { profileWithLinks, toAchievement, toProfile } from "@/lib/rules/profile";
import { titleWithKind, toAdminTitle } from "@/lib/rules/titles";
import { listPhotoVersions, PHOTO_PURPOSES, toPhotoVersion } from "@/lib/profile/photos";
import { ProfileManager } from "./_components/ProfileManager";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const [profile, achievements, systems, titles, titleKinds, education, photos] = await Promise.all([
    db.profile.findUnique({ where: { id: 1 }, ...profileWithLinks }),
    db.achievement.findMany({ orderBy: [{ sortOrder: "asc" }, { achievedOn: "desc" }] }),
    db.system.findMany({ where: { contentStatus: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.profileTitle.findMany({ ...titleWithKind, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    db.titleKind.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    db.education.findMany({ orderBy: { startDate: "desc" }, select: { id: true, qualification: true, institution: true } }),
    listPhotoVersions(db),
  ]);

  return (
    <>
      <AdminPageHeader icon={UserRound} title="Profile" description="Who you are on the site and the CV. Every field here is shown somewhere; leave optional ones empty to hide them." />
      {profile ? (
        <ProfileManager key={profile.updatedAt.toISOString()} now={new Date().getTime()} profile={toProfile(profile)} achievements={achievements.map(toAchievement)} systems={systems} titles={titles.map((t) => toAdminTitle(t))} titleKinds={titleKinds.map((k) => ({ key: k.key, label: k.label }))} education={education.map((e) => ({ id: e.id, label: `${e.qualification} — ${e.institution}` }))} photos={photos.map(toPhotoVersion)} photoPurposes={Object.entries(PHOTO_PURPOSES).map(([key, p]) => ({ key, label: p.label, description: p.description }))} />
      ) : (
        <p className="text-sm text-critical">The profile row is missing — run the seed (npx prisma db seed).</p>
      )}
    </>
  );
}
