// app/(admin)/admin/(panel)/layout.tsx
// The admin panel shell (#104): a graphite sidebar beside bone content, on
// every signed-in admin page. /admin/login lives outside this group, so the
// sign-in screen stays bare. The session is checked here as well as by the
// proxy (BR-3.1, defence in depth); nothing renders without a current one.

import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdminId } from "@/lib/auth/current-admin";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminId();
  return (
    <div className="min-h-screen bg-paper lg:flex">
      <AdminNav />
      <main id="main" className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
