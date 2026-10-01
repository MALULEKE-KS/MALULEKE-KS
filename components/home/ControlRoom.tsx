// components/home/ControlRoom.tsx
// Home — the control room (PUBLIC-REDESIGN-PLAN §3.2, with §3.5's numbers
// folded in): the platform reporting on itself — the proof behind the hero's
// "already running". A terminal (Magic UI, adapted) plays live checks read
// from the database the moment the page was loaded (PublicPlatformPulse);
// beside it, the same facts as tiles and the owner's approved figures
// (PublicMetric, BR-5.3 — none approved, none shown). With the AI guide on,
// a visitor can ask it how these rules are enforced.

import { Activity, BarChart3, GitBranch, ScrollText, ShieldCheck } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Terminal, type TerminalLine } from "@/components/ui/terminal";
import { AskGuideButton } from "@/components/guide/AskGuideButton";
import { ago } from "@/lib/queries/work";
import { Accent } from "@/components/shared/Accent";

/** An owner-approved figure (PublicMetric — BR-5.3). */
export interface CuratedNumber {
  key: string;
  label: string;
  description: string | null;
  unit: string | null;
  value: number;
}

interface Pulse {
  rulesEnforcedByDatabase: number;
  auditEventsLast7Days: number;
  auditEventsTotal: number;
  lastSuccessfulJobAt: string | null;
  lastGithubSyncAt: string | null;
  deployment: { commit: string; environment: string | null } | null;
}

export function ControlRoom({ pulse, numbers }: { pulse: Pulse; numbers: CuratedNumber[] }) {
  const synced = ago(pulse.lastGithubSyncAt ? new Date(pulse.lastGithubSyncAt) : null);
  const job = ago(pulse.lastSuccessfulJobAt ? new Date(pulse.lastSuccessfulJobAt) : null);
  const build = pulse.deployment ? `build ${pulse.deployment.commit}${pulse.deployment.environment ? ` · ${pulse.deployment.environment}` : ""}` : "running a local development build";

  const lines: TerminalLine[] = [
    { kind: "command", text: "platform status --live" },
    { kind: "ok", text: `${pulse.rulesEnforcedByDatabase} business rules enforced by the database itself` },
    { kind: "ok", text: `${pulse.auditEventsLast7Days} changes audited this week · ${pulse.auditEventsTotal} in total` },
    { kind: "ok", text: "every public page reads through a read-only database role" },
    ...(synced ? [{ kind: "ok" as const, text: `GitHub synced ${synced}` }] : []),
    ...(job ? [{ kind: "ok" as const, text: `scheduled jobs healthy · last run ${job}` }] : []),
    { kind: "info", text: build },
  ];

  const tiles = [
    { icon: ShieldCheck, value: pulse.rulesEnforcedByDatabase, label: "rules the database enforces" },
    { icon: ScrollText, value: pulse.auditEventsLast7Days, label: "changes audited this week" },
  ];

  return (
    <section aria-labelledby="control-title" className="bg-paper py-20 md:py-28">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <Reveal>
              <SectionHeader
                icon={Activity}
                eyebrow="Proof, not claims"
                id="control-title"
                title={<Accent text="The platform, *reporting on itself.*" className="type-accent text-ember-gradient pr-[0.06em]" />}
                description="Counted live from this site's own database when you loaded the page — the rules it refuses to break, every change it records, and when it last checked GitHub."
                className="mb-8 md:mb-10"
              />
            </Reveal>
            <Reveal delay={80}>
              <dl className="grid grid-cols-2 gap-3">
                {tiles.map(({ icon: Icon, value, label }) => (
                  <div key={label} className="border-ink/10 bg-sheet shadow-soft rounded-2xl border p-5">
                    <Icon aria-hidden="true" className="text-accent size-4" />
                    <dd className="type-data text-ink mt-3 text-4xl font-semibold">
                      <NumberTicker value={value} />
                    </dd>
                    <dt className="text-slate mt-1 text-sm">{label}</dt>
                  </div>
                ))}
                {synced && (
                  <div className="border-ink/10 bg-sheet shadow-soft col-span-2 flex items-center gap-3 rounded-2xl border px-5 py-4">
                    <GitBranch aria-hidden="true" className="text-accent size-4" />
                    <dt className="text-slate text-sm">GitHub last synced</dt>
                    <dd className="text-ink ml-auto text-sm font-medium">{synced}</dd>
                  </div>
                )}
              </dl>
            </Reveal>
          </div>

          <Reveal className="lg:col-span-7" delay={120}>
            <Terminal lines={lines} title="maluleke-ks — live" />
            <div className="mt-4 flex justify-end">
              <AskGuideButton question="How does this platform enforce its business rules?" variant="default" size="default">
                Ask the AI guide how
              </AskGuideButton>
            </div>
          </Reveal>
        </div>

        {numbers.length > 0 && (
          <Reveal className="mt-16">
            <p className="text-slate mb-4 inline-flex items-center gap-2 font-mono text-xs tracking-wide uppercase">
              <BarChart3 aria-hidden="true" className="size-3.5" /> Figures, each one approved
            </p>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
              {numbers.slice(0, 5).map((n) => (
                <div key={n.key} className="border-ink/10 bg-sheet shadow-soft rounded-2xl border p-6">
                  <dt className="text-slate text-sm font-medium">{n.label}</dt>
                  <dd className="mt-3 flex items-baseline gap-1.5">
                    <NumberTicker value={n.value} decimalPlaces={Number.isInteger(n.value) ? 0 : 1} className="type-data text-ink text-5xl font-semibold" />
                    {n.unit && <span className="text-slate text-lg">{n.unit}</span>}
                  </dd>
                  {n.description && <dd className="text-slate mt-3 text-sm leading-relaxed">{n.description}</dd>}
                </div>
              ))}
            </dl>
          </Reveal>
        )}
      </Container>
    </section>
  );
}
