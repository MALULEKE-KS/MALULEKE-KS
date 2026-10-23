// app/(admin)/admin/(panel)/layout.tsx
// The admin panel shell (#104; the admin pass, D-057): the sidebar, page bar,
// phone dock and search around every signed-in admin page. /admin/login lives
// outside this group, so the sign-in screen stays bare. The session is checked
// here as well as by the proxy (BR-3.1, defence in depth); nothing renders
// without a current one. The counts and the search index are read here, once
// per request, and again whenever an editor refreshes.

import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminId } from "@/lib/auth/current-admin";
import { getAdminShell } from "@/lib/queries/admin-shell";

export const dynamic = "force-dynamic";

// The browser tab says it's the admin, not the public site; never indexed.
export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminId();
  const shell = await getAdminShell();
  return <AdminShell data={shell}>{children}</AdminShell>;
}
