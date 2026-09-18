// components/shared/NotFoundContent.tsx
// The one 404 message, shared by app/not-found.tsx (unmatched URLs) and
// app/(public)/not-found.tsx (notFound() from a public page). An unknown
// system slug and an unpublished one both end up here, so they are
// indistinguishable — never a distinct "this one's private" message, which
// would itself leak that a hidden system exists (BR-1.3/1.4;
// PAGE-SPECIFICATIONS.md "/systems/[slug]" behavior).
//
// Copy follows Design System §4.4: what happened, what to do next, no apology.

import { TextLink } from "@/components/shared/TextLink";
import { Container } from "@/components/shared/Container";

export function NotFoundContent() {
  return (
    <Container>
      <section className="max-w-2xl py-16">
        {/* The HTTP status is a literal identifier, which is what mono is for. */}
        <p className="text-slate mb-2 font-mono text-xs">404</p>
        <h1 className="text-ink mb-4 font-sans text-2xl font-semibold">Page not found</h1>
        <p className="text-ink mb-6 font-sans">
          Nothing exists at this address. Check the URL, or start from the home page or the systems catalog.
        </p>
        <div className="flex gap-6">
          <TextLink href="/">Home</TextLink>
          <TextLink href="/systems">Systems</TextLink>
        </div>
      </section>
    </Container>
  );
}
