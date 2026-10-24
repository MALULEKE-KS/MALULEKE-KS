// components/home/orbit/OrbitPoster.tsx
// The Orbit's still (D-069): the same rings and worlds as the live scene, drawn as an SVG on the
// server — no JavaScript — so the hero has its picture from the first paint. It is what a browser
// without WebGL keeps, and what the live scene fades in over.

import type { OrbitData } from "@/lib/queries/orbit";
import {
  CORE_RADIUS,
  START,
  matrices,
  project,
  ring,
  ringPoint,
  startAngle,
  worldRadius,
} from "@/lib/home/orbit-geometry";

const SIZE = 1000;

export function OrbitPoster({ data }: { data: OrbitData }) {
  const { PV } = matrices({ yaw: START.yaw, pitch: START.pitch, dist: 3.4, target: [0, 0, 0] }, 1);
  const at = (p: [number, number, number]) => project(PV, p, SIZE, SIZE);
  const scale = SIZE / 2 / Math.tan((34 * Math.PI) / 360);
  const homes = [...new Set(data.systems.map((s) => s.home))].sort((a, b) => a - b);
  const rings = homes.map((h) => {
    const pts = Array.from({ length: 97 }, (_, i) => at(ringPoint(h, (i / 96) * Math.PI * 2)));
    return {
      h,
      d: pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(""),
    };
  });
  const worlds = data.systems.map((s) => {
    const inHome = data.systems.filter((o) => o.home === s.home);
    const commits = s.weeks.reduce((a, b) => a + b, 0);
    const [x, y, w] = at(
      ringPoint(s.home, startAngle(inHome.indexOf(s), inHome.length, s.home), ring(s.home).r)
    );
    return { slug: s.slug, flagship: s.flagship, x, y, r: (worldRadius(commits) * scale) / w, w };
  });
  const [cx, cy, cw] = at([0, 0, 0]);
  const coreR = (CORE_RADIUS * scale) / cw;
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" className="orbit-poster">
      <defs>
        <radialGradient id="orbit-core">
          <stop offset="0" stopColor="#fff3e8" />
          <stop offset="0.35" stopColor="#ff8a55" />
          <stop offset="0.7" stopColor="#c2410c" stopOpacity="0.55" />
          <stop offset="1" stopColor="#c2410c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="orbit-glow">
          <stop offset="0" stopColor="#ff5b1f" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff5b1f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="orbit-flag" cx="0.34" cy="0.32">
          <stop offset="0" stopColor="#ffe9dc" />
          <stop offset="0.3" stopColor="#ff8a55" />
          <stop offset="0.75" stopColor="#c2410c" />
          <stop offset="1" stopColor="#3b1306" />
        </radialGradient>
        <radialGradient id="orbit-world" cx="0.34" cy="0.32">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.25" stopColor="#f4f2ee" />
          <stop offset="0.75" stopColor="#6f747b" />
          <stop offset="1" stopColor="#2a2d33" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={coreR * 5} fill="url(#orbit-glow)" />
      {rings.map((r) => (
        <path
          key={r.h}
          d={r.d}
          fill="none"
          stroke="rgb(244 242 238 / 0.12)"
          strokeWidth="1.2"
          strokeDasharray="1 5"
        />
      ))}
      <circle cx={cx} cy={cy} r={coreR * 1.6} fill="url(#orbit-core)" />
      {worlds
        .sort((a, b) => b.w - a.w)
        .map((w) => (
          <circle
            key={w.slug}
            cx={w.x}
            cy={w.y}
            r={Math.max(3, w.r)}
            fill={w.flagship ? "url(#orbit-flag)" : "url(#orbit-world)"}
            opacity={w.flagship ? 1 : 0.75}
          />
        ))}
    </svg>
  );
}
