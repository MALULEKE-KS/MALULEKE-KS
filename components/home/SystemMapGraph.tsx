// components/home/SystemMapGraph.tsx
// The system map's drawing (PUBLIC-REDESIGN-PLAN §3.4): three columns — homes,
// the work in them, the technologies it's built with — joined by beams.
// Adapted from Magic UI's Animated Beam: the original gives every beam its
// own full-size SVG and resize observer, which would mean dozens here; this
// measures once and draws every connection in one SVG, and the travelling
// light is a CSS dash (the `beam-travel` keyframes in globals.css), not an
// animated gradient per path. Hover or focus any node and its connections
// light up in ember while the rest dims. Below lg the beams give way to a
// grouped list; under prefers-reduced-motion the light doesn't travel.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FolderGit2, Github } from "lucide-react";
import { techMark } from "@/components/shared/TechChip";
import type { MapNode, SystemMapData } from "@/lib/queries/map";
import { cn } from "@/lib/utils";

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
      for (const [from, to] of data.edges) {
        const a = nodes.current.get(from)?.getBoundingClientRect();
        const b = nodes.current.get(to)?.getBoundingClientRect();
        if (!a || !b || a.width === 0 || b.width === 0) continue;
        const sx = a.right - c.left;
        const sy = a.top + a.height / 2 - c.top;
        const ex = b.left - c.left;
        const ey = b.top + b.height / 2 - c.top;
        const mx = (sx + ex) / 2;
        next.push({ from, to, d: `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}` });
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
      {/* lg and up: the drawing. */}
      <div ref={container} className="relative hidden lg:grid lg:grid-cols-[1fr_1.25fr_0.9fr] lg:gap-x-20">
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

        <Column title="GitHub homes">
          {data.homes.map((n) => (
            <NodeCard key={n.id} node={n} register={register} dim={lit !== null && !lit.has(n.id)} {...hover(n.id)} />
          ))}
        </Column>
        <Column title="The work">
          {data.work.map((n) => (
            <NodeCard key={n.id} node={n} register={register} dim={lit !== null && !lit.has(n.id)} {...hover(n.id)} />
          ))}
        </Column>
        <Column title="Built with">
          {data.tech.length > 0 ? (
            data.tech.map((n) => <NodeCard key={n.id} node={n} register={register} dim={lit !== null && !lit.has(n.id)} {...hover(n.id)} />)
          ) : (
            <p className="text-mist text-sm">Technologies appear here as systems are curated.</p>
          )}
        </Column>
      </div>

      {/* Below lg: grouped by home. */}
      <div className="grid gap-4 lg:hidden">
        {data.homes.map((h) => {
          const ids = new Set(data.edges.filter(([a]) => a === h.id).map(([, b]) => b));
          const work = data.work.filter((w) => ids.has(w.id));
          return (
            <div key={h.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <NodeCard node={h} />
              <ul className="mt-3 grid gap-2 border-l border-white/10 pl-4">
                {work.map((w) => (
                  <li key={w.id}>
                    <NodeCard node={w} compact />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {data.tech.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {data.tech.map((t) => (
              <li key={t.id}>
                <NodeCard node={t} compact />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col justify-center gap-3">
      <p className="text-mist mb-1 font-mono text-[11px] tracking-[0.14em] uppercase">{title}</p>
      {children}
    </div>
  );
}

function NodeCard({
  node,
  register,
  dim = false,
  compact = false,
  ...events
}: {
  node: MapNode;
  register?: (id: string) => (el: HTMLElement | null) => void;
  dim?: boolean;
  compact?: boolean;
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
        {node.sub && !compact && <span className="text-line block truncate text-[11px]">{node.sub}</span>}
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
