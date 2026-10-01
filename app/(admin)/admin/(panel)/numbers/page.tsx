// app/(admin)/admin/(panel)/numbers/page.tsx
// Curated numbers (#105, BR-5.3): every figure the site states, its public
// value, the proposal waiting on a decision, and its history. Computed
// numbers are proposed from public data ("Compute now" or the daily run);
// manual ones are entered here. Nothing is public until approved.

import { BarChart3 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { listAdminMetrics } from "@/lib/metrics";
import { NumbersManager } from "./_components/NumbersManager";

export const dynamic = "force-dynamic";

export default async function AdminNumbersPage() {
  const metrics = await listAdminMetrics();
  return (
    <>
      <AdminPageHeader
        icon={BarChart3}
        title="Numbers"
        description="Every number the site states. A new value is only a proposal until you approve it; history is never rewritten (BR-5.3)."
      />
      <NumbersManager metrics={metrics} />
    </>
  );
}
