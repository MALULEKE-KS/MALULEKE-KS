// app/(admin)/admin/(panel)/freshness/page.tsx
// Stale content (#105, BR-1.16): live pages nobody has edited or confirmed
// for content.freshnessDays, oldest first. Each can be opened to edit, or
// marked reviewed when it's still accurate — which restarts its clock.

import Link from "next/link";
import { Leaf } from "lucide-react";
import { AdminPageHeader, EmptyState, Panel } from "@/components/admin/ui";
import { getStaleContent } from "@/lib/queries/freshness";
import { FreshnessList } from "./_components/FreshnessList";

export const dynamic = "force-dynamic";

export default async function AdminFreshnessPage() {
  const { thresholdDays, items } = await getStaleContent();
  return (
    <>
      <AdminPageHeader
        icon={Leaf}
        title="Freshness"
        description={
          <>
            Live content untouched for {thresholdDays} days or more. The window is a setting —{" "}
            <Link href="/admin/settings" className="font-medium text-accent hover:underline">change it in Settings</Link>.
          </>
        }
      />
      <Panel>
        {items.length === 0 ? (
          <EmptyState icon={Leaf}>Everything live has been edited or reviewed within {thresholdDays} days.</EmptyState>
        ) : (
          <FreshnessList items={items} />
        )}
      </Panel>
    </>
  );
}
