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
import { ArrowRight, Building2, CalendarRange, FileText, Hammer, Hourglass, Rocket, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
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
  /** The owner's uploaded CV while it's switched on — the second button; else how he builds. */
  cvUrl: string | null;
}

export function HomeHero({ stats, profile, titles, intro, cvUrl }: HomeHeroProps) {
  // The ledger is computed per request, so "as of" is literally now.
  const asOf = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  // Until the block is written, the profile's own headline stands in.
  const headline = intro?.headline ?? profile.headline ?? profile.role;

  const ledger = [
    { value: stats.yearsBuilding, label: stats.yearsBuilding === 1 ? "year building" : "years building", icon: CalendarRange, live: false },
    { value: stats.organizationsFounded, label: stats.organizationsFounded === 1 ? "organisation founded" : "organisations founded", icon: Building2, live: false },
    { value: stats.systemsShipped, label: "systems shipped", icon: Rocket, live: false },
    ...(stats.systemsBuilding > 0 ? [{ value: stats.systemsBuilding, label: "in progress", icon: Hammer, live: true }] : []),
    ...(stats.systemsQueued > 0 ? [{ value: stats.systemsQueued, label: "queued", icon: Hourglass, live: false }] : []),
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
              {cvUrl ? (
                <a href={cvUrl}>
                  <FileText />
                  Get my CV
                </a>
              ) : (
                <Link href="/about#method">
                  <Workflow />
                  How I build
                </Link>
              )}
            </Button>
          </div>

          {/* The proof strip: live counts, never typed-in copy (PublicLedger). A glass
              panel with a slow light running its edge; each count is its own card,
              lit in ember where the pointer is, counting up as it comes into view. */}
          <div className="bg-night-deep/60 shadow-lift relative mt-12 rounded-3xl border border-white/10 p-1.5 backdrop-blur lg:max-w-2xl">
            <BorderBeam size={110} duration={10} colorFrom="var(--color-ember)" colorTo="#ffb547" />
            <ul aria-label="The record, live" className={cn("grid grid-cols-2 gap-1.5", LEDGER_COLS[ledger.length])}>
              {ledger.map((item, i) => {
                const Icon = item.icon;
                return (
                  <li key={item.label} className="min-w-0 [&:last-child:nth-child(odd)]:col-span-2 sm:[&:last-child:nth-child(odd)]:col-span-1">
                    <MagicCard className="h-full rounded-[1.1rem]" gradientSize={180}>
                      <div className="flex h-full flex-col gap-5 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-ember grid size-8 place-items-center rounded-xl border border-white/10 bg-white/[0.04] transition-colors group-hover:border-ember/40 group-hover:bg-ember/10">
                            <Icon aria-hidden="true" className="size-4" />
                          </span>
                          {item.live && (
                            <span className="relative flex size-2" aria-hidden="true">
                              <span className="live-ping bg-ember absolute inset-0 rounded-full" />
                              <span className="bg-ember relative size-2 rounded-full" />
                            </span>
                          )}
                        </div>
                        <p className="flex flex-col">
                          <span className="type-data bg-[linear-gradient(180deg,var(--color-paper),rgb(244_242_238/0.55))] bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
                            <NumberTicker value={item.value} delay={i * 0.12} />
                          </span>
                          <span className="text-mist mt-1 text-xs">{item.label}</span>
                        </p>
                      </div>
                    </MagicCard>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-5">
          <HeroGuide />
        </div>
      </Container>
    </section>
  );
}
