// app/not-found.tsx
// Unmatched URLs (/anything-that-is-no-route). Nothing wraps this — no
// (public) layout sits above it — so it composes the public chrome itself.
// notFound() calls from inside (public) use app/(public)/not-found.tsx
// instead, which renders within the existing layout; using this file there
// would draw the header and footer twice.

import { NotFoundContent } from "@/components/shared/NotFoundContent";
import { PublicShell } from "@/components/shared/PublicShell";

export default function NotFound() {
  return (
    <PublicShell>
      <NotFoundContent />
    </PublicShell>
  );
}
