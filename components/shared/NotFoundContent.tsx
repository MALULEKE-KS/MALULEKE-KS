// components/shared/NotFoundContent.tsx
// The one 404 message, shared by app/not-found.tsx (unmatched URLs) and
// app/(public)/not-found.tsx (notFound() from a public page). An unknown
// system slug and an unpublished one both end up here, so they are
// indistinguishable — never a distinct "this one's private" message, which
// would itself leak that a hidden system exists (BR-1.3/1.4;
// PAGE-SPECIFICATIONS.md "/systems/[slug]" behavior).
//
// Copy follows Design System §4.5: what happened, what to do next, no apology.

import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { Container } from "@/components/shared/Container";

export function NotFoundContent() {
  return (
    <section aria-labelledby="nf-title" className="hero-field text-paper min-h-[60vh]">
      <Container className="py-24 md:py-32">
        {/* The HTTP status is a literal identifier, which is what mono is for. */}
        <p className="text-mist inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs">
          <Compass aria-hidden="true" className="text-ember size-3.5" />
          404
        </p>
        <h1
          id="nf-title"
          className="mt-6 font-sans text-4xl font-semibold tracking-tight md:text-6xl"
        >
          Nothing lives at this address.
        </h1>
        <p className="text-mist mt-5 max-w-xl text-lg leading-relaxed">
          Check the URL, or start from the home page or the systems catalog.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="bg-ember text-ink shadow-glow-ember focus-visible:outline-paper inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Home
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Link
            href="/systems"
            className="text-paper focus-visible:outline-ember inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            The systems
          </Link>
        </div>
      </Container>
    </section>
  );
}
