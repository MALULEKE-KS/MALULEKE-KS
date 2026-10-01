// app/(admin)/admin/(panel)/systems/[id]/page.tsx
// The full system editor (#105): every field SystemUpdateInputSchema accepts,
// grouped by what the owner is deciding — the story, where it's shown,
// whether it may be published (BR-1.1, BR-1.11, BR-1.13) — plus impacts,
// skills, case-study history (BR-1.15), and the facts nobody edits by hand
// (GitHub metadata, status history, old addresses that redirect).
// See docs/PAGE-SPECIFICATIONS.md ("/admin/systems/[id]").

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, ExternalLink } from "lucide-react";
import { AdminPageHeader, adminButton, Pill } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { systemWithAdminRelations, toAdminSystem } from "@/lib/rules/publishing";
import { SystemEditor } from "./_components/SystemEditor";
import { currentScreenshot } from "@/lib/systems/screenshots";

export const dynamic = "force-dynamic";

export default async function AdminSystemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const system = await db.system.findUnique({
    where: { id },
    include: {
      ...systemWithAdminRelations.include,
      skills: { select: { skillId: true } },
      statusChanges: { orderBy: { changedAt: "desc" }, take: 20, include: { toStatus: true } },
      slugHistory: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!system) notFound();

  const [statuses, domains, organizations, relationships, skills, screenshot] = await Promise.all([
    db.status.findMany({ where: { OR: [{ active: true }, { id: system.statusId }] }, orderBy: { label: "asc" } }),
    db.domain.findMany({ where: { OR: [{ active: true }, ...(system.domainId ? [{ id: system.domainId }] : [])] }, orderBy: { label: "asc" } }),
    db.organization.findMany({ orderBy: { name: "asc" } }),
    db.repoRelationship.findMany({ where: { OR: [{ active: true }, ...(system.repoRelationshipId ? [{ id: system.repoRelationshipId }] : [])] }, orderBy: { label: "asc" } }),
    db.skill.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    currentScreenshot(system.id),
  ]);

  const admin = toAdminSystem(system);
  const publicHref = `/systems/${system.slug}`;

  return (
    <>
      <Link href="/admin/systems" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-ink">
        <ArrowLeft aria-hidden="true" className="size-4" /> All systems
      </Link>
      <AdminPageHeader
        icon={Boxes}
        title={system.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Pill tone={system.contentStatus === "PUBLISHED" ? "good" : "neutral"}>{system.contentStatus.toLowerCase()}</Pill>
            {system.needsCuration && <Pill tone="attention">needs curation — saving clears it</Pill>}
            <span className="font-mono text-xs">{publicHref}</span>
          </span>
        }
        actions={
          system.contentStatus === "PUBLISHED" ? (
            <a href={publicHref} target="_blank" rel="noreferrer" className={adminButton.secondary}>
              <ExternalLink aria-hidden="true" /> View live
            </a>
          ) : undefined
        }
      />
      {/* Keyed on updatedAt: after a save or a restore the refreshed record remounts the form. */}
      <SystemEditor
        key={admin.updatedAt}
        now={new Date().getTime()}
        system={{
          ...admin,
          statusKey: system.status.key,
          domainKey: system.domain?.key ?? null,
          organizationId: system.organizationId,
          contentStatus: admin.contentStatus.toLowerCase() as "draft" | "published" | "archived",
          impacts: system.impacts.map((i) => ({ id: i.id, label: i.label, value: i.value, sortOrder: i.sortOrder })),
          skillIds: system.skills.map((s) => s.skillId),
          screenshot,
        }}
        options={{
          statuses: statuses.map((s) => ({ key: s.key, label: s.active ? s.label : `${s.label} (deprecated)` })),
          domains: domains.map((d) => ({ key: d.key, label: d.active ? d.label : `${d.label} (deprecated)` })),
          organizations: organizations.map((o) => ({ id: o.id, label: o.isClient ? `${o.name} (client)` : o.name })),
          relationships: relationships.map((r) => ({ key: r.key, label: r.label, requiresOwnerPermission: r.requiresOwnerPermission })),
          skills,
        }}
        history={{
          statusChanges: system.statusChanges.map((c) => ({
            id: c.id,
            to: c.toStatus.label,
            stage: c.toStage.toLowerCase(),
            backfilled: c.backfilled,
            at: c.changedAt.toISOString(),
          })),
          previousSlugs: system.slugHistory.map((s) => ({ slug: s.slug, at: s.createdAt.toISOString() })),
        }}
      />
    </>
  );
}
