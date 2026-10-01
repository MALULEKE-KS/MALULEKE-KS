// components/home/HomeHero.tsx
// Home, section 1 (PUBLIC-REDESIGN-PLAN §3.1). Dual-column hero on the quiet
// graphite field: left — an understated introduction that points at the
// evidence rather than claiming (the owner's brief, 2026-09-30), his name and
// current titles as quiet detail, what to do next, and the live ledger as the
// proof; right — the AI guide's character in his likeness (§3a), on its own.
//
// Every statement is sourced: the introduction is the admin-edited
// "home-intro" block, the titles are ProfileTitle rows (D13), the numbers are
// computed per request from PublicLedger. Nothing invented, nothing in code.

import Link from "next/link";
import { ArrowRight, FileText, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Container } from "@/components/shared/Container";
import { HeroGuide } from "@/components/home/HeroGuide";
import type { SiteProfile } from "@/lib/queries/site";
import { cn } from "@/lib/utils";
import { Accent } from "@/components/shared/Accent";

// Static class names so Tailwind sees them: one column per ledger entry from sm up.
const LEDGER_COLS: Record<number, string> = { 3: "sm:grid-cols-3", 4: "sm:grid-cols-4", 5: "sm:grid-cols-5" };

interface HomeHeroProps {
  stats: {
    yearsBuilding: number;
    organizationsFounded: number;
    systemsShipped: number;
    systemsBuilding: number;
    systemsQueued: number;
  };
  profile: SiteProfile;
  titles: { kind: string; label: string; detail: string | null }[];
  intro: { headline: string; lede: string } | null;
  /** Whether a CV is offered (PublicCvOption) — the second button, else the method. */
  hasCv: boolean;
}

export function HomeHero({ stats, profile, titles, intro, hasCv }: HomeHeroProps) {
  // The ledger is computed per request, so "as of" is literally now.
  const asOf = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  // Until the block is written, the profile's own headline stands in.
  const headline = intro?.headline ?? profile.headline ?? profile.role;

  const ledger = [
    { value: stats.yearsBuilding, label: stats.yearsBuilding === 1 ? "year building" : "years building" },
    { value: stats.organizationsFounded, label: stats.organizationsFounded === 1 ? "organisation founded" : "organisations founded" },
    { value: stats.systemsShipped, label: "systems shipped" },
    ...(stats.systemsBuilding > 0 ? [{ value: stats.systemsBuilding, label: "in progress" }] : []),
    ...(stats.systemsQueued > 0 ? [{ value: stats.systemsQueued, label: "queued" }] : []),
  ];

  return (
    <section aria-labelledby="hero-title" className="hero-field text-paper overflow-hidden">
      <Container className="grid items-center gap-12 pt-28 pb-16 md:pt-32 md:pb-20 lg:grid-cols-12 lg:gap-8 lg:pt-32 lg:pb-20">
        <div className="lg:col-span-7">
          <p className="text-mist flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pr-3 pl-2.5 backdrop-blur">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="live-ping absolute inset-0 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
                <span className="relative size-2 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
              </span>
              Live, as of {asOf}
            </span>
            <span className="type-eyebrow">{profile.name}</span>
          </p>

          <h1 id="hero-title" className="type-display mt-7 max-w-[18ch]">
            <Accent text={headline} className="type-accent text-ember-gradient pr-[0.06em]" />
          </h1>
          {intro?.lede && <p className="type-lede text-mist mt-6 max-w-[58ch]">{intro.lede}</p>}

          {titles.length > 0 && (
            <ul className="mt-7 flex flex-wrap gap-2" aria-label="Current titles">
              {titles.map((t) => (
                <li key={`${t.kind}:${t.label}`} className="text-mist rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs sm:text-[13px]">
                  <span className="text-paper">{t.label}</span>
                  {t.detail && <span> · {t.detail}</span>}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
              <Link href="/systems">
                See the work
                <ArrowRight />
              </Link>
            </Button>
            {/* Let's talk lives in the header on every page, and the AI has its own
                section below — so the second button is the other thing visitors come
                for: the CV (or, if none is offered, how the work is done). */}
            <Button asChild variant="glass" size="lg" className="w-full sm:w-auto">
              {hasCv ? (
                <Link href="/cv">
                  <FileText />
                  Get my CV
                </Link>
              ) : (
                <Link href="/method">
                  <Workflow />
                  How I build
                </Link>
              )}
            </Button>
          </div>

          {/* The proof strip: live counts, never typed-in copy (PublicLedger). */}
          <dl className={cn("mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:max-w-2xl", LEDGER_COLS[ledger.length])}>
            {ledger.map((item) => (
              <div key={item.label} className="bg-night-deep/85 flex flex-col-reverse px-4 py-4 backdrop-blur sm:px-5 [&:last-child:nth-child(odd)]:col-span-2 sm:[&:last-child:nth-child(odd)]:col-span-1">
                <dt className="text-mist mt-1 text-xs">{item.label}</dt>
                <dd className="type-data text-paper text-3xl font-medium">
                  <NumberTicker value={item.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-5">
          <HeroGuide />
        </div>
      </Container>
    </section>
  );
}
