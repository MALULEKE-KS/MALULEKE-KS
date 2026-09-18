// app/(admin)/admin/systems/page.tsx
// Dense sortable/filterable table — name, org, status, contentStatus,
// needsCuration, flagship, sortOrder. See docs/PAGE-SPECIFICATIONS.md
// ("/admin/systems").

import Link from "next/link";
import { db } from "@/lib/db";
import { systemWithAdminRelations, toAdminSystem } from "@/lib/rules/publishing";

// Auth-gated and reads live curation state — must never be statically
// prerendered (CI's build job has no DATABASE_URL, and baked-in HTML
// would hide real-time needsCuration/status changes anyway).
export const dynamic = "force-dynamic";

export default async function AdminSystemsListPage() {
  const systems = await db.system.findMany({
    ...systemWithAdminRelations,
    orderBy: [{ needsCuration: "desc" }, { updatedAt: "desc" }],
  });
  const rows = systems.map(toAdminSystem);

  return (
    <section className="px-6 py-12 max-w-5xl mx-auto">
      <h1 className="font-sans font-semibold text-2xl text-ink mb-6">Systems</h1>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate/30 text-left font-mono text-xs text-slate">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Organization</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Content</th>
            <th className="py-2 pr-4">Curation</th>
            <th className="py-2 pr-4">Flagship</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((system) => (
            <tr key={system.id} className="border-b border-slate/10 hover:bg-slate/5">
              <td className="py-2 pr-4">
                <Link href={`/admin/systems/${system.id}`} className="font-medium text-ink underline underline-offset-2">
                  {system.name}
                </Link>
              </td>
              <td className="py-2 pr-4 text-slate">{system.organization}</td>
              <td className="py-2 pr-4 font-mono text-xs">{system.status}</td>
              <td className="py-2 pr-4 font-mono text-xs">{system.contentStatus}</td>
              <td className="py-2 pr-4">
                {system.needsCuration && (
                  <span className="font-mono text-xs text-accent">Needs curation</span>
                )}
              </td>
              <td className="py-2 pr-4">{system.isFlagship && <span aria-hidden="true">■</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && <p className="font-sans text-slate mt-6">No systems yet.</p>}
    </section>
  );
}
