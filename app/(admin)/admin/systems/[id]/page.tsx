// app/(admin)/admin/systems/[id]/page.tsx
// Detail/edit form matching SystemUpdateInputSchema. Publish toggle disabled
// with an inline reason (not a silent 409) when BR-1.1 would block it.
// See docs/PAGE-SPECIFICATIONS.md ("/admin/systems/[id]").

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { systemWithAdminRelations, toAdminSystem } from "@/lib/rules/publishing";
import { SystemEditForm } from "./_components/SystemEditForm";

interface AdminSystemDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminSystemDetailPage({ params }: AdminSystemDetailPageProps) {
  const { id } = await params;
  const system = await db.system.findUnique({ where: { id }, ...systemWithAdminRelations });

  if (!system) notFound();

  return (
    <section className="px-6 py-12 max-w-3xl mx-auto">
      <h1 className="font-sans font-semibold text-2xl text-ink mb-6">{system.name}</h1>
      <SystemEditForm system={toAdminSystem(system)} />
    </section>
  );
}
