// components/home/NumbersStrip.tsx
// Home, "By the numbers" (PAGE-SPECIFICATIONS.md / → 3, Constitution §8, #100):
// three to five curated figures. Only values the admin has approved are ever
// shown (BR-5.3 — PublicMetric exposes approved values only), nothing live or
// per-visitor, and with none approved the section doesn't render at all.

import { BarChart3 } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Container } from "@/components/shared/Container";
import { Reveal } from "@/components/shared/Reveal";
import { SectionHeader } from "@/components/shared/SectionHeader";

export interface CuratedNumber {
  key: string;
  label: string;
  description: string | null;
  unit: string | null;
  value: number;
}

const MAX_SHOWN = 5; // the spec's "three to five"

export function NumbersStrip({ numbers }: { numbers: CuratedNumber[] }) {
  const shown = numbers.slice(0, MAX_SHOWN);
  if (shown.length === 0) return null;

  return (
    <section
      aria-labelledby="numbers-title"
      className="border-ink/10 bg-paper border-t py-20 md:py-24"
    >
      <Container>
        <Reveal>
          <SectionHeader
            icon={BarChart3}
            eyebrow="By the numbers"
            id="numbers-title"
            title="Figures, each one approved."
          />
        </Reveal>
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
          {shown.map((n, i) => (
            <Reveal key={n.key} delay={i * 80}>
              <div className="border-ink/10 bg-sheet shadow-soft h-full rounded-2xl border p-6">
                <dt className="text-slate text-sm font-medium">{n.label}</dt>
                <dd className="mt-3 flex items-baseline gap-1.5">
                  <NumberTicker
                    value={n.value}
                    decimalPlaces={Number.isInteger(n.value) ? 0 : 1}
                    className="text-ink font-sans text-5xl font-semibold tracking-tight"
                  />
                  {n.unit && <span className="text-slate text-lg">{n.unit}</span>}
                </dd>
                {n.description && (
                  <dd className="text-slate mt-3 text-sm leading-relaxed">{n.description}</dd>
                )}
              </div>
            </Reveal>
          ))}
        </dl>
      </Container>
    </section>
  );
}
