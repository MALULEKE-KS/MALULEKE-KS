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

export default function PublicError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container>
      <section className="max-w-2xl py-16">
        <h1 className="text-ink mb-4 font-sans text-2xl font-semibold">This page failed to load</h1>
        <p className="text-ink mb-6 font-sans">
          The data behind it could not be read. Try again; if it keeps failing, come back in a few minutes.
        </p>
        {error.digest && <p className="text-slate mb-6 font-mono text-xs">Reference: {error.digest}</p>}
        <Button type="button" onClick={() => retry()}>
          Try again
        </Button>
      </section>
    </Container>
  );
}
