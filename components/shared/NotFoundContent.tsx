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
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { HeroLabel } from "@/components/shared/HeroKit";
import { buttonVariants } from "@/components/ui/button";

// The shared hero shape (D-046, D-055): the plain label, the heading, one line, two actions.
// It fills the screen, so no empty band shows between it and the footer.
export function NotFoundContent() {
  return (
    <section aria-labelledby="nf-title" className="hero-field text-paper flex min-h-svh items-center">
      <Container className="grid items-center gap-12 pt-28 pb-16 md:pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          {/* The HTTP status is a literal identifier, which is what mono is for. */}
          <HeroLabel>
            <span className="font-mono">404</span>
          </HeroLabel>
          <h1 id="nf-title" className="type-display mt-6 text-balance">
            Nothing lives at this address.
          </h1>
          <p className="type-lede text-mist mt-5 max-w-xl">Check the URL, or start from the home page or the systems catalog.</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/" className={buttonVariants({ variant: "accent", size: "lg" })}>
              Home
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/systems" className={buttonVariants({ variant: "glass", size: "lg" })}>
              The systems
            </Link>
          </div>
        </div>
        <div aria-hidden="true" className="relative mx-auto w-full max-w-[22rem] lg:max-w-none">
          <Image
            src="/brand/ks-cube-3d.webp"
            alt=""
            width={820}
            height={789}
            priority
            sizes="(min-width: 1024px) 40vw, 22rem"
            className="relative h-auto w-full motion-safe:animate-[ks-float_7s_ease-in-out_infinite]"
          />
        </div>
      </Container>
    </section>
  );
}
