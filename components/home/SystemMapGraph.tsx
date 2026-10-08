// components/home/SystemMapGraph.tsx
// The system map's drawing (PUBLIC-REDESIGN-PLAN §3.4): three columns — homes,
// the work in them, the technologies it's built with — joined by beams.
// Adapted from Magic UI's Animated Beam: the original gives every beam its
// own full-size SVG and resize observer, which would mean dozens here; this
// measures once and draws every connection in one SVG, and the travelling
// light is a CSS dash (the `beam-travel` keyframes in globals.css), not an
// animated gradient per path. Hover or focus any node and its connections
// light up in ember while the rest dims. The technologies are one wide,
// wrapping cluster — every one of them a beam's end, the most used set larger
// (home.map.techInGraph) — so the whole map fits on one screen instead of a
// tall column (owner, 2026-10-08). A phone gets the same drawing, not a
// different one (owner, same day): the three columns become three bands —
// homes, the work, the technologies — and the beams run down between them.
// Taps light a node's connections the way hover does. Under
// prefers-reduced-motion the light doesn't travel.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FolderGit2, Github } from "lucide-react";
import { techMark } from "@/components/shared/TechChip";
import type { MapNode, SystemMapData } from "@/lib/queries/map";
import { cn } from "@/lib/utils";

/** How the technologies are ordered (owner, 2026-10-03: say how the ranking works). */
const RANKING = "Most used first — by how many projects on the map use it.";

interface Path {
  from: string;
  to: string;
  d: string;
}

export function SystemMapGraph({ data }: { data: SystemMapData }) {
  const container = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = useState<Path[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [active, setActive] = useState<string | null>(null);
  // The beams' travelling light only runs while the map is on screen.
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const box = container.current;
    if (!box) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(!!e?.isIntersecting), { rootMargin: "100px" });
    io.observe(box);
    return () => io.disconnect();
  }, []);

  const register = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(id, el);
    else nodes.current.delete(id);
  }, []);

  // Measure every node once per layout change and draw all the connections.
  useEffect(() => {
    const box = container.current;
    if (!box) return;
    const measure = () => {
      const c = box.getBoundingClientRect();
      if (c.width === 0) return;
      const next: Path[] = [];
      // Columns side by side from lg (Tailwind's 64rem); stacked bands below it.
      const wide = window.matchMedia("(min-width: 64rem)").matches;
      for (const [from, to] of data.edges) {
        const a = nodes.current.get(from)?.getBoundingClientRect();
        const b = nodes.current.get(to)?.getBoundingClientRect();
        if (!a || !b || a.width === 0 || b.width === 0) continue;
        if (wide) {
          // Side by side (wide screens): right edge to left edge.
          const sx = a.right - c.left;
          const sy = a.top + a.height / 2 - c.top;
          const ex = b.left - c.left;
          const ey = b.top + b.height / 2 - c.top;
          const mx = (sx + ex) / 2;
          next.push({ from, to, d: `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}` });
        } else {
          // Stacked (phones): bottom edge to top edge.
          const sx = a.left + a.width / 2 - c.left;
          const sy = a.bottom - c.top;
          const ex = b.left + b.width / 2 - c.left;
          const ey = b.top - c.top;
          const my = (sy + ey) / 2;
          next.push({ from, to, d: `M${sx},${sy} C${sx},${my} ${ex},${my} ${ex},${ey}` });
        }
      }
      setSize({ w: c.width, h: c.height });
      setPaths(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [data.edges]);

  // What's connected to the active node (either direction, one hop — and for
  // a home, through its work to the technologies).
  const lit = useMemo(() => {
    if (!active) return null;
    const on = new Set<string>([active]);
    for (const [a, b] of data.edges) {
      if (a === active) on.add(b);
      if (b === active) on.add(a);
    }
    if (active.startsWith("home:")) for (const [a, b] of data.edges) if (on.has(a) && a !== active) on.add(b);
    return on;
  }, [active, data.edges]);

  const hover = (id: string) => ({
    onMouseEnter: () => setActive(id),
    onMouseLeave: () => setActive(null),
    onFocus: () => setActive(id),
    onBlur: () => setActive(null),
  });

  return (
    <>
      {/* The drawing: three bands on a phone, three columns from lg. */}
      <div ref={container} className="relative grid grid-cols-1 gap-y-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.55fr)] lg:gap-x-14 lg:gap-y-0 xl:gap-x-20">
        <svg aria-hidden="true" width={size.w} height={size.h} className={cn("pointer-events-none absolute inset-0 overflow-visible", !onScreen && "[&_path]:[animation-play-state:paused]")}>
          {paths.map((p, i) => {
            const on = !lit || (lit.has(p.from) && lit.has(p.to));
            return (
              <g key={`${p.from}>${p.to}`} className="transition-opacity duration-300" style={{ opacity: on ? 1 : 0.12 }}>
                <path d={p.d} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth={1.25} />
                <path
                  d={p.d}
                  fill="none"
                  pathLength={1000}
                  stroke={lit && on ? "var(--color-ember)" : "url(#beam)"}
                  strokeWidth={lit && on ? 1.75 : 1.5}
                  strokeLinecap="round"
                  strokeDasharray="90 910"
                  className="motion-safe:animate-[beam-travel_4.5s_linear_infinite] motion-reduce:[stroke-dasharray:none] motion-reduce:opacity-40"
                  style={{ animationDelay: `${(i % 9) * -0.5}s` }}
                />
              </g>
            );
          })}
          <defs>
            <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff5b1f" />
              <stop offset="100%" stopColor="#ffb547" />
            </linearGradient>
          </defs>
        </svg>

        <Column title="GitHub homes" className="max-lg:grid max-lg:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] max-lg:gap-2">
          {data.homes.map((n) => (
            <NodeCard key={n.id} node={n} register={register} dim={lit !== null && !lit.has(n.id)} {...hover(n.id)} />
          ))}
        </Column>
        <Column title="The work" className="max-lg:grid max-lg:grid-cols-2 max-lg:gap-2">
          {data.work.map((n) => (
            <NodeCard key={n.id} node={n} register={register} dim={lit !== null && !lit.has(n.id)} compactBelowLg {...hover(n.id)} />
          ))}
        </Column>
        <Column title="Built with" note={RANKING}>
          {data.tech.length > 0 ? (
            // Every technology the work uses — never dropped, every one joined to its work.
            <ul className="flex flex-wrap content-center items-center gap-1.5">
              {data.tech.map((t, i) => {
                const lead = i < data.techInGraph;
                return (
                  <li key={t.id}>
                    <span
                      ref={register(t.id)}
                      tabIndex={0}
                      title={t.sub}
                      {...hover(t.id)}
                      className={cn(
                        "focus-visible:outline-ember bg-night/85 relative z-10 inline-flex items-center gap-1.5 rounded-full border transition-[opacity,border-color] duration-300 focus-visible:outline-2",
                        lead ? "text-paper px-3 py-1.5 text-[13px] font-medium" : "text-mist px-2.5 py-1 text-[11.5px]",
                        active === t.id ? "border-ember/70" : lead ? "border-white/15 hover:border-ember/50" : "border-white/10 hover:border-ember/50",
                        lit !== null && !lit.has(t.id) && "opacity-30",
                      )}
                    >
                      {techMark(t.label)}
                      {t.label}
                      <span className={cn("type-data text-[10.5px]", active === t.id ? "text-ember" : "text-line")}>{t.sub?.split(" ")[0]}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-mist text-sm">Technologies appear here as systems are curated.</p>
          )}
        </Column>
      </div>
    </>
  );
}

function Column({ title, note, className, children }: { title: string; note?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("relative flex flex-col justify-center gap-3", className)}>
      <p className="text-mist mb-1 font-mono text-[11px] tracking-[0.14em] uppercase max-lg:col-span-full max-lg:mb-0">{title}</p>
      {note && <p className="text-line -mt-3 mb-1 text-[11px] max-lg:col-span-full max-lg:-mt-1">{note}</p>}
      {children}
    </div>
  );
}

function NodeCard({
  node,
  register,
  dim = false,
  compact = false,
  compactBelowLg = false,
  ...events
}: {
  node: MapNode;
  register?: (id: string) => (el: HTMLElement | null) => void;
  dim?: boolean;
  compact?: boolean;
  /** Two to a row on a phone: the second line waits for wide screens. */
  compactBelowLg?: boolean;
} & Partial<Record<"onMouseEnter" | "onMouseLeave" | "onFocus" | "onBlur", () => void>>) {
  const mark = node.kind === "tech" ? techMark(node.label) : null;
  const icon =
    node.kind === "home" ? <Github aria-hidden="true" className="text-ember size-4 shrink-0" /> : node.kind === "work" && node.faint ? <FolderGit2 aria-hidden="true" className="text-line size-4 shrink-0" /> : mark;
  const body = (
    <>
      {node.kind === "work" && !node.faint && node.colorToken && (
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: `var(--color-${node.colorToken}-on-dark, var(--color-${node.colorToken}))` }} />
      )}
      {icon}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate", node.kind === "home" ? "text-paper text-[15px] font-semibold" : node.faint ? "text-mist text-sm" : "text-paper text-sm font-medium")}>{node.label}</span>
        {node.sub && !compact && <span className={cn("text-line truncate text-[11px]", compactBelowLg ? "hidden lg:block" : "block")}>{node.sub}</span>}
      </span>
      {node.href && <ArrowUpRight aria-hidden="true" className="text-line group-hover/n:text-ember size-3.5 shrink-0 transition-colors" />}
    </>
  );
  const cls = cn(
    "group/n relative z-10 flex items-center gap-2.5 rounded-xl border px-3.5 transition-[opacity,border-color,background-color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
    compact ? "py-2" : node.kind === "home" ? "py-3.5" : "py-2.5",
    node.faint ? "border-dashed border-white/12 bg-night/60" : "border-white/10 bg-night/85 hover:border-ember/50",
    node.kind === "tech" && "w-fit",
    dim && "opacity-35",
  );
  const ref = register?.(node.id);
  if (!node.href) {
    return (
      <div ref={ref} tabIndex={register ? 0 : undefined} className={cls} {...events}>
        {body}
      </div>
    );
  }
  return node.external ? (
    <a ref={ref} href={node.href} target="_blank" rel="noopener noreferrer" className={cls} {...events}>
      {body}
    </a>
  ) : (
    <Link ref={ref} href={node.href} className={cls} {...events}>
      {body}
    </Link>
  );
}
