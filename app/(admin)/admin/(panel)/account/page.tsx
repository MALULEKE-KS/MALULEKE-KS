// app/(admin)/admin/(panel)/account/page.tsx
// The owner's own account (#104): sign-in facts, password change (BR-3.15)
// and recovery codes (BR-3.11/3.12). Both changes re-authenticate with the
// current password and a fresh authenticator code (BR-3.14).

import { KeyRound } from "lucide-react";
import { AdminPageHeader, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requireAdminId } from "@/lib/auth/current-admin";
import { recoveryCodeStatus } from "@/lib/auth/recovery-codes";
import { AccountForms } from "./_components/AccountForms";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  const adminUserId = await requireAdminId();
  const admin = await db.adminUser.findUniqueOrThrow({
    where: { id: adminUserId },
    select: { email: true, twoFactorEnabled: true, lastLoginAt: true, recoveryCodes: true, updatedAt: true },
  });
  const codes = recoveryCodeStatus(admin.recoveryCodes);

  return (
    <>
      <AdminPageHeader icon={KeyRound} title="Account" description="Your sign-in. Changing the password ends every other session." />
      <Panel title="Sign-in" className="mb-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-slate">Email</dt>
            <dd className="mt-1 break-all font-medium text-ink">{admin.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate">Two-factor</dt>
            <dd className="mt-1">
              <Pill tone={admin.twoFactorEnabled ? "good" : "critical"}>{admin.twoFactorEnabled ? "on" : "off"}</Pill>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate">Last sign-in</dt>
            <dd className="mt-1 text-ink">{formatWhen(admin.lastLoginAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate">Recovery codes left</dt>
            <dd className="mt-1">
              <Pill tone={codes.low ? "attention" : "good"}>{codes.remaining}</Pill>
            </dd>
          </div>
        </dl>
      </Panel>
      <AccountForms recoveryCodesLow={codes.low} />
    </>
  );
}
