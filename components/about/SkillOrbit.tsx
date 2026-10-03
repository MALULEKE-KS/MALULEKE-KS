// components/about/SkillOrbit.tsx
// The skills that published systems prove, in orbit round the K-S mark
// (Magic UI Orbiting Circles): the most-proven on the inner ring, the rest on
// the outer one, turning the other way. Decorative — the same skills are
// listed, linked and counted beside it — so it is hidden from assistive tech.
// Scales down on a phone so it always fits the screen.

import { CubeMark } from "@/components/shared/BrandMark";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import { SkillIcon } from "@/components/about/skill-icons";

function Orbiter({ name, count }: { name: string; count: number }) {
  return (
    <span title={`${name} — ${count} system${count === 1 ? "" : "s"}`} className="bg-sheet border-ink/10 text-ink shadow-soft grid size-full place-items-center rounded-2xl border">
      <SkillIcon name={name} />
    </span>
  );
}

export function SkillOrbit({ skills }: { skills: { name: string; count: number }[] }) {
  if (skills.length === 0) return null;
  const inner = skills.slice(0, Math.min(6, skills.length));
  const outer = skills.slice(inner.length, inner.length + 10);
  return (
    <div aria-hidden="true" className="relative mx-auto grid size-[340px] origin-center scale-[0.88] place-items-center sm:scale-100 lg:size-[420px] lg:scale-100">
      <div className="pointer-events-none absolute inset-[18%] rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.18),transparent)]" />
      <div className="bg-night shadow-lift relative grid size-24 place-items-center rounded-[1.75rem] border border-white/10 lg:size-28">
        <CubeMark className="size-14 lg:size-16" />
      </div>
      <OrbitingCircles radius={100} duration={28} iconSize={44}>
        {inner.map((s) => (
          <Orbiter key={s.name} name={s.name} count={s.count} />
        ))}
      </OrbitingCircles>
      {outer.length > 0 && (
        <OrbitingCircles radius={160} duration={44} iconSize={40} reverse>
          {outer.map((s) => (
            <Orbiter key={s.name} name={s.name} count={s.count} />
          ))}
        </OrbitingCircles>
      )}
    </div>
  );
}
