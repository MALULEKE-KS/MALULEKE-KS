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

import Link from "next/link";

export default function AboutPage() {
  return (
    <article className="py-16 max-w-2xl">
      <h1 className="font-sans font-semibold text-2xl text-ink mb-1">About</h1>
      <p className="font-sans text-slate mb-10">Final-year BSc Computer Science &amp; Mathematics · South Africa</p>

      <div className="font-serif text-ink leading-relaxed space-y-5 max-w-prose">
        <p>
          I&rsquo;m a final-year Computer Science and Mathematics student building production-grade systems —
          full-stack web, AI integration, and enterprise automation — across fintech, EdTech, GovTech, and SaaS.
          Architecture and design come before any code is written; one system gets built at a time, no forward
          dependencies, no shortcuts taken to hit a date instead of a standard.
        </p>
        <p>
          This platform is itself one of those systems: a database-backed, full-stack application, not a static
          portfolio describing one. Every rule it enforces — a publish gate that checks client approval
          server-side, an audit log every admin action writes to, an AI agent with no privileged write path — is
          the same discipline applied to client and personal work alike.
        </p>
      </div>

      <div className="border-t border-slate/20 pt-6 mt-10">
        <h2 className="font-mono text-xs text-slate uppercase tracking-wide mb-4">Organizations</h2>
        <dl className="space-y-3">
          <div>
            <dt className="font-sans text-sm font-medium text-ink">KSDRILL-SA</dt>
            <dd className="font-sans text-sm text-slate">Founder &amp; Principal Engineer</dd>
          </div>
          <div>
            <dt className="font-sans text-sm font-medium text-ink">GrowthCore Solutions</dt>
            <dd className="font-sans text-sm text-slate">Co-Founder</dd>
          </div>
        </dl>
      </div>

      <div className="border-t border-slate/20 pt-6 mt-10 flex gap-6 font-mono text-xs">
        <Link href="/journey" className="text-accent underline underline-offset-2">
          The full journey →
        </Link>
        <Link href="/how-i-build" className="text-accent underline underline-offset-2">
          How I build →
        </Link>
      </div>
    </article>
  );
}
