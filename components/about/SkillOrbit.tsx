// components/about/SkillOrbit.tsx
// Every skill in use, in orbit round the K-S mark (Magic UI Orbiting Circles'
// motion, the `orbit-ring` keyframes in app/globals.css). Owner, 2026-10-03:
// all of them, "no stone left unturned" — but only skills a published system
// really uses; the toolkit that isn't in a system yet stays out of the orbit
// (it is listed below it). The most used fill the inner ring; rings are added
// until every one has a place, each turning the other way from the last.
//
// One drawing at every size: it's laid out on a 640-unit square and scaled to
// its box with container units (--orbit-unit), so a phone shows the same
// orbit, smaller. Decorative — the same skills are listed, linked and counted
// beside it — so it is hidden from assistive tech. Reduced motion: still,
// spread round each ring.

import { CubeMark } from "@/components/shared/BrandMark";
import { SkillIcon } from "@/components/about/skill-icons";
import { cn } from "@/lib/utils";

const BOX = 640;
const FIRST_RADIUS = 112;
const RING_STEP = 62;
const MAX_RADIUS = 296;
const PROVEN_SIZE = 42;
const TOOLKIT_SIZE = 34;
const SPACING = 10; // between orbiters on a ring

interface Orbiter {
  name: string;
  count: number;
}
interface Ring {
  radius: number;
  size: number;
  items: Orbiter[];
}

/** Rings, inside out, until every skill has a place. */
function layout(skills: Orbiter[]): Ring[] {
  const rings: Ring[] = [];
  let radius = FIRST_RADIUS;
  let rest = skills;
  while (rest.length > 0) {
    const proven = rest[0]!.count > 0;
    const size = proven ? PROVEN_SIZE : TOOLKIT_SIZE;
    const capacity = Math.max(1, Math.floor((2 * Math.PI * radius) / (size + SPACING)));
    // A ring holds one kind: the proven ones never share a ring with the toolkit.
    const sameKind = rest.findIndex((s) => s.count > 0 !== proven);
    const take = Math.min(capacity, sameKind === -1 ? rest.length : sameKind);
    rings.push({ radius, size, items: rest.slice(0, take) });
    rest = rest.slice(take);
    // Past the edge: tighten the step rather than drop anyone.
    radius = Math.min(radius + RING_STEP, MAX_RADIUS);
  }
  return rings;
}

export function SkillOrbit({ skills }: { skills: Orbiter[] }) {
  // In use only: a skill no published system uses never orbits.
  const used = skills.filter((s) => s.count > 0);
  if (used.length === 0) return null;
  const sorted = [...used].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const rings = layout(sorted);
  const unit = `calc(100cqw / ${BOX})`;
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-[560px] [container-type:inline-size]">
      <div className="relative grid aspect-square w-full place-items-center" style={{ "--orbit-unit": unit } as React.CSSProperties}>
        <div className="pointer-events-none absolute inset-[22%] rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.18),transparent)]" />
        {/* The rings themselves, on the same 640-unit square. */}
        <svg viewBox={`0 0 ${BOX} ${BOX}`} className="pointer-events-none absolute inset-0 size-full">
          {rings.map((r) => (
            <circle key={r.radius} cx={BOX / 2} cy={BOX / 2} r={r.radius} fill="none" className="stroke-ink/10" strokeWidth={1} strokeDasharray="3 5" />
          ))}
        </svg>
        <div className="bg-night shadow-lift relative grid size-[15%] place-items-center rounded-[22%] border border-white/10">
          <CubeMark className="size-[62%]" />
        </div>
        {rings.map((ring, r) =>
          ring.items.map((s, i) => (
            <div
              key={s.name}
              title={s.count > 0 ? `${s.name} — ${s.count} system${s.count === 1 ? "" : "s"}` : `${s.name} — in the toolkit`}
              className={cn("orbit-ring absolute flex items-center justify-center transform-gpu", r % 2 === 1 && "[animation-direction:reverse]")}
              style={
                {
                  "--duration": 26 + ring.radius / 6,
                  "--radius": ring.radius,
                  "--angle": (360 / ring.items.length) * i + r * 9,
                  width: `calc(${ring.size} * var(--orbit-unit))`,
                  height: `calc(${ring.size} * var(--orbit-unit))`,
                } as React.CSSProperties
              }
            >
              <span
                className={cn(
                  "grid size-full place-items-center rounded-[30%] border",
                  s.count > 0 ? "bg-sheet border-ink/10 text-ink shadow-soft" : "bg-paper/80 border-ink/15 text-slate border-dashed",
                )}
              >
                <SkillIcon name={s.name} className="size-[52%]" />
              </span>
            </div>
          )),
        )}
      </div>
    </div>
  );
}
