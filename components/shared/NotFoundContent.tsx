// components/shared/NotFoundContent.tsx
// The one 404 message, shared by app/not-found.tsx (unmatched URLs) and
// app/(public)/not-found.tsx (notFound() from a public page). An unknown
// system slug and an unpublished one both end up here, so they are
// indistinguishable — never a distinct "this one's private" message, which
// would itself leak that a hidden system exists (BR-1.3/1.4;
// PAGE-SPECIFICATIONS.md "/systems/[slug]" behavior).
//
// Copy follows Design System §4.5: what happened, what to do next, no apology.
// Beside it, the K-S Cube rendered in 3D (design/brand/) — one of the places
// the rendered cube appears (with the share image and the home-screen icon).

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { Container } from "@/components/shared/Container";

export function NotFoundContent() {
  return (
    <section aria-labelledby="nf-title" className="hero-field text-paper min-h-[60vh]">
      <Container className="grid items-center gap-12 py-24 md:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
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
        </div>
        <div aria-hidden="true" className="relative mx-auto w-full max-w-[26rem] lg:max-w-none">
          <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.16),transparent)] blur-2xl" />
          <Image
            src="/brand/ks-cube-3d.webp"
            alt=""
            width={820}
            height={789}
            priority
            sizes="(min-width: 1024px) 40vw, 26rem"
            className="relative h-auto w-full motion-safe:animate-[ks-float_7s_ease-in-out_infinite]"
          />
        </div>
      </Container>
    </section>
  );
}
