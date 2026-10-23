// app/(public)/error.tsx
// Error boundary for the public pages — nearly all of which read from
// Postgres, so a transient failure (a Neon cold start, a dropped connection)
// lands here. Renders inside the (public) layout, so header and footer stay.
//
// Uses retry(), not reset(): retry re-fetches and re-renders the segment,
// which is what recovers from a transient data failure; reset() would only
// re-render the same failed state (Next.js error.js docs).
//
// Copy follows Design System §4.4: what happened, what to do next, no
// apology. The digest is a real identifier that matches the server-side log
// entry, so it is shown in mono.

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";
import { HeroLabel } from "@/components/shared/HeroKit";

export default function PublicError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // The shared hero shape (D-055): label, heading, one line, the action — and the reference to quote.
  return (
    <section aria-labelledby="err-title" className="hero-field text-paper flex min-h-svh items-center">
      <Container className="pt-28 pb-16 md:pt-32">
        <div className="max-w-2xl">
          <HeroLabel>Something went wrong</HeroLabel>
          <h1 id="err-title" className="type-display mt-6 text-balance">
            This page failed to load.
          </h1>
          <p className="type-lede text-mist mt-5">The data behind it could not be read. Try again; if it keeps failing, come back in a few minutes.</p>
          {error.digest && <p className="text-line type-micro mt-4">Reference: {error.digest}</p>}
          <Button type="button" variant="accent" size="lg" className="mt-9" onClick={() => retry()}>
            Try again
          </Button>
        </div>
      </Container>
    </section>
  );
}
