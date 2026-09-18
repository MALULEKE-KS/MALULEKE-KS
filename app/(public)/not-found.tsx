// app/(public)/not-found.tsx
// notFound() from a public page (e.g. an unknown or unpublished system slug).
// Renders inside the (public) layout, which already supplies the header,
// footer and container — so this is content only. Same content as the
// root app/not-found.tsx, so the two 404 paths are indistinguishable.

import { NotFoundContent } from "@/components/shared/NotFoundContent";

export default function PublicNotFound() {
  return <NotFoundContent />;
}
