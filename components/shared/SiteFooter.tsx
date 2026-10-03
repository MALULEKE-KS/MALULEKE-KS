// components/shared/SiteFooter.tsx
// The public footer (F5c, D11). It never repeats the header: it carries what
// the header can't — the three GitHub homes with their live
// system counts (PublicHome), how to reach the owner (profile + the review
// promise, BR-2.2), and a status line the platform reports on itself
// (PublicPlatformPulse). Then the signature: the wordmark cut out of a field
// of dithered ember dots. Everything here is data, never typed-in copy. The
// mission isn't repeated here: it has its own band on the home page and
// /method (owner's rule: no duplicates, 2026-10-01).
//
// V1 finalization (owner, 2026-10-02): no typed-in "Built on …" stack — the
// platform's own case study shows its stack, from data; no raw email or
// WhatsApp number on every page (spec WP-105, D-006) — the form is the way
// in, and /contact keeps the alternatives; and the version the site is on,
// with what's next, from the "release" content block.

import Link from "next/link";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { BrandMark, Wordmark } from "@/components/shared/BrandMark";
import { Container } from "@/components/shared/Container";
import { DitheredWordmark } from "@/components/shared/DitheredWordmark";
import { SocialLinks } from "@/components/shared/SocialLinks";
import { PrivacyChoicesButton } from "@/components/shared/Consent";
import type { SiteProfile } from "@/lib/queries/site";

export interface FooterHome {
  name: string;
  slug: string;
  role: string | null;
  kind: string | null;
  publishedSystems: number;
  github: { login: string; url: string }[];
}

export interface FooterRelease {
  current: string;
  next: string | null;
  nextNote: string | null;
  link: string | null;
}

export interface FooterPulse {
  rulesEnforcedByDatabase: number;
  lastGithubSyncAt: string | null;
  deployment: { commit: string; environment: string | null } | null;
}

/** "3 h ago" — against the request time (this chrome renders per request). */
function ago(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

const KIND_LABEL: Record<string, string> = { personal: "Personal account" };

export function SiteFooter({
  profile,
  reviewSlaHours,
  homes,
  pulse,
  release,
}: {
  profile: SiteProfile;
  reviewSlaHours: number;
  homes: FooterHome[];
  pulse: FooterPulse;
  release: FooterRelease | null;
}) {
  const now = new Date();
  return (
    <footer className="relative overflow-hidden bg-night-deep text-paper">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <Container className="grid gap-12 pb-12 pt-20 md:grid-cols-12">
        <div className="md:col-span-5">
          <Link href="/" className="inline-flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-ember">
            <BrandMark className="h-8 text-paper" />
            <Wordmark className="font-mono text-sm font-medium" />
          </Link>
          <SocialLinks links={profile.links.filter((l) => !l.url.includes("wa.me"))} className="mt-8" />
        </div>

        {homes.length > 0 && (
          <div className="md:col-span-4">
            <h2 className="font-mono text-xs text-line">Where the code lives</h2>
            <ul className="mt-4 space-y-2">
              {homes.map((h) => (
                <li key={h.slug}>
                  <a
                    href={h.github[0]?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 transition-colors hover:border-ember/30 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-ember"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <FaGithub aria-hidden="true" className="size-4 shrink-0 text-mist transition-colors group-hover:text-paper" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-paper">{h.name}</span>
                        <span className="block text-xs text-line">{h.role ?? (h.kind ? KIND_LABEL[h.kind] ?? null : null) ?? "GitHub"}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-mist">
                      <span className="font-mono text-paper">{h.publishedSystems}</span>
                      {h.publishedSystems === 1 ? "system" : "systems"}
                      <ArrowUpRight aria-hidden="true" className="size-3.5 text-line transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ember motion-reduce:transition-none" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="md:col-span-3">
          <h2 className="font-mono text-xs text-line">Let&rsquo;s talk</h2>
          <p className="mt-4 text-sm text-mist">Every inquiry is reviewed within {reviewSlaHours} hours.</p>
          <Link href="/contact" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-ember hover:underline">
            Start a conversation <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </Container>

      <Container>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-5 font-mono text-xs text-line">
          <span className="inline-flex items-center gap-2 text-mist">
            <span aria-hidden="true" className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-signal-finished-on-dark)]/60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
            </span>
            {pulse.rulesEnforcedByDatabase} business rules enforced by the database
          </span>
          {pulse.lastGithubSyncAt && <span>· synced with GitHub {ago(pulse.lastGithubSyncAt, now)}</span>}
          {pulse.deployment && <span>· build {pulse.deployment.commit}</span>}
          {release && (
            <span>
              ·{" "}
              {release.link ? (
                <Link href={release.link} className="underline-offset-4 transition-colors hover:text-paper hover:underline">
                  {release.current}
                  {release.next && ` · ${release.next}${release.nextNote ? ` ${release.nextNote}` : ""}`}
                </Link>
              ) : (
                <>
                  {release.current}
                  {release.next && ` · ${release.next}${release.nextNote ? ` ${release.nextNote}` : ""}`}
                </>
              )}
            </span>
          )}
        </p>
      </Container>

      <DitheredWordmark text="MALULEKE-KS" />

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-3 py-5 font-mono text-xs text-line md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {now.getFullYear()} {profile.name}.{profile.location ? ` Engineered in ${profile.location}.` : ""}
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <PrivacyChoicesButton className="underline-offset-4 transition-colors hover:text-paper hover:underline" />
            <a href="#main" className="inline-flex items-center gap-1 transition-colors hover:text-paper">
              Back to top <ArrowUp aria-hidden="true" className="size-3" />
            </a>
          </p>
        </Container>
      </div>
    </footer>
  );
}
