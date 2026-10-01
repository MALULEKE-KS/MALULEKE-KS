// app/(admin)/admin/login/page.tsx
// Admin sign-in (Design System §5, BR-3.1–BR-3.3). Outside the panel group,
// so it has no sidebar. The reason for arriving here (an ended session, a
// sign-out) is shown as neutral copy — nothing went wrong.

import type { Metadata } from "next";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

const REASONS: Record<string, string> = {
  session_ended: "Your session ended. Sign in again to continue.",
  signed_out: "You've signed out.",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <LoginForm notice={reason ? (REASONS[reason] ?? null) : null} />;
}
