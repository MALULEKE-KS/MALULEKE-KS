// app/(admin)/admin/(panel)/organizations/page.tsx
// The organizations systems belong to (#105): ventures founded, clients, the
// owner's own — with the GitHub logins the sync maps repos by. Organizations
// are never deleted (systems reference them).

import { Building2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { organizationWithCount, toAdminOrganization } from "@/lib/rules/organizations";
import { OrganizationsManager } from "./_components/OrganizationsManager";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
  const [orgs, kinds] = await Promise.all([
    db.organization.findMany({ ...organizationWithCount, orderBy: { name: "asc" } }),
    db.organizationKind.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
  ]);
  return (
    <>
      <AdminPageHeader
        icon={Building2}
        title="Organisations"
        description="Who each system was built for or under. The GitHub sync files a repo under the organisation whose login matches its owner."
      />
      <OrganizationsManager organizations={orgs.map(toAdminOrganization)} kinds={kinds.map((k) => ({ key: k.key, label: k.label }))} />
    </>
  );
}
