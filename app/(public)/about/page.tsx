// app/(public)/about/page.tsx
// /about — first-person narrative, org affiliations, pointers to /journey
// and /how-i-build.
//
// The page spec also calls for the subtitle/framing line to shift per
// active VisitorLens while the body stays stable. VisitorLensProvider is
// still a stub (no context, no persisted lens choice yet — Constitution
// §4's picker isn't built) and personalization isn't part of V1's explicit
// scope (CLAUDE.md), so this ships with the one stable subtitle rather than
// faking a lens system that doesn't exist yet. Swap the static subtitle
// below for a lens-driven one once VisitorLensProvider is real.
// See docs/PAGE-SPECIFICATIONS.md ("/about").

import { TextLink } from "@/components/shared/TextLink";
import { Container } from "@/components/shared/Container";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <Container>
      <article className="max-w-2xl py-16">
        <h1 className="text-ink mb-1 font-sans text-2xl font-semibold">About</h1>
        <p className="text-slate mb-10 font-sans">
          Final-year BSc in Computer Science and Mathematics, based in South Africa.
        </p>

        <div className="text-ink max-w-prose space-y-5 font-serif leading-relaxed">
          <p>
            I&rsquo;m a final-year Computer Science and Mathematics student building production-grade systems —
            full-stack web, AI integration, and enterprise automation — across fintech, EdTech, GovTech, and SaaS.
            Architecture and design come before any code is written; one system gets built at a time, no forward
            dependencies, no shortcuts taken to hit a date instead of a standard.
          </p>
          <p>
            This platform is itself one of those systems: a database-backed, full-stack application, not a static
            portfolio describing one. Every rule it enforces — a publish gate that checks client approval server-side,
            an audit log every admin action writes to, an AI agent with no privileged write path — is the same
            discipline applied to client and personal work alike.
          </p>
        </div>

        <div className="border-slate/20 mt-10 border-t pt-6">
          <h2 className="text-ink mb-4 font-sans text-xl font-semibold">Organizations</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-ink font-sans text-sm font-medium">KSDRILL-SA</dt>
              <dd className="text-slate font-sans text-sm">Founder &amp; Principal Engineer</dd>
            </div>
            <div>
              <dt className="text-ink font-sans text-sm font-medium">GrowthCore Solutions</dt>
              <dd className="text-slate font-sans text-sm">Co-Founder</dd>
            </div>
          </dl>
        </div>

        <div className="border-slate/20 mt-10 flex gap-6 border-t pt-6">
          <TextLink href="/journey">The full journey</TextLink>
          <TextLink href="/how-i-build">How I build</TextLink>
        </div>
      </article>
    </Container>
  );
}
