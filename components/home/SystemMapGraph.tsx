// components/home/SystemMapGraph.tsx
// The system map's drawing (PUBLIC-REDESIGN-PLAN §3.4): GitHub homes, the work
// in them, the technologies it's built with — joined by beams.
// Adapted from Magic UI's Animated Beam: the original gives every beam its
// own full-size SVG and resize observer, which would mean dozens here; this
// measures once and draws every connection in one SVG, and the travelling
// light is a CSS dash (the `beam-travel` keyframes in globals.css), not an
// animated gradient per path.
//
// Tracing (owner, 2026-10-08): one click or tap on anything selects it and
// lights its whole chain — a home, its work and everything that work is built
// with; a technology, the work using it and the homes that work lives in — while
// the rest dims. A second click on the same thing opens its link (a technology
// lets go instead); a click anywhere else, Clear or Escape goes back to normal.
// A mouse previews on hover; the keyboard opens links with Enter as usual. The
// bar above the drawing says what's selected, what it connects to, and opens it.
//
// Wide screens: three columns, every beam drawn. Phones get their own layout,
// not the wide one squeezed (owner, same day: "poor and noisy"): three bands —
// homes two by two, the work two by two, the most used technologies with the
// rest a tap away — and only the homes' beams at rest. A selection draws just
// its own beams down the bands, and its technologies join the cluster. Under
// prefers-reduced-motion the light doesn't travel.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FolderGit2, Github, MousePointerClick, X } from "lucide-react";
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

/** What a node does under the pointer, the finger and the keyboard. */
type Interact = {
  "data-map-node": "";
  onPointerEnter: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
  onClick: (e: React.MouseEvent) => void;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function SystemMapGraph({ data }: { data: SystemMapData }) {
  const container = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = useState<Path[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [wide, setWide] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [allTech, setAllTech] = useState(false);
  const active = pinned ?? hovered;

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
      // Columns side by side from lg (Tailwind's 64rem); stacked bands below it.
      const isWide = window.matchMedia("(min-width: 64rem)").matches;
      const next: Path[] = [];
      for (const [from, to] of data.edges) {
        const a = nodes.current.get(from)?.getBoundingClientRect();
        const b = nodes.current.get(to)?.getBoundingClientRect();
        if (!a || !b || a.width === 0 || b.width === 0) continue;
        if (isWide) {
          // Side by side: right edge to left edge.
          const sx = a.right - c.left;
          const sy = a.top + a.height / 2 - c.top;
          const ex = b.left - c.left;
          const ey = b.top + b.height / 2 - c.top;
          const mx = (sx + ex) / 2;
          next.push({ from, to, d: `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}` });
        } else {
          // Stacked: bottom edge to top edge.
          const sx = a.left + a.width / 2 - c.left;
          const sy = a.bottom - c.top;
          const ex = b.left + b.width / 2 - c.left;
          const ey = b.top - c.top;
          const my = (sy + ey) / 2;
          next.push({ from, to, d: `M${sx},${sy} C${sx},${my} ${ex},${my} ${ex},${ey}` });
        }
      }
      setWide(isWide);
      setSize({ w: c.width, h: c.height });
      setPaths(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [data.edges]);

  const byId = useMemo(() => new Map([...data.homes, ...data.work, ...data.tech].map((n) => [n.id, n])), [data]);

  // The active node's chain: its neighbours both ways; a home through its work
  // to the technologies; a technology through its work to the homes.
  const lit = useMemo(() => {
    if (!active) return null;
    const on = new Set<string>([active]);
    for (const [a, b] of data.edges) {
      if (a === active) on.add(b);
      if (b === active) on.add(a);
    }
    if (active.startsWith("home:")) {
      for (const [a, b] of data.edges) if (on.has(a) && a !== active) on.add(b);
    } else if (active.startsWith("tech:")) {
      for (const [a, b] of data.edges) if (on.has(b) && byId.get(a)?.kind === "home") on.add(a);
    }
    return on;
  }, [active, data.edges, byId]);

  // A selection lets go on a click elsewhere or Escape.
  useEffect(() => {
    if (!pinned) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.("[data-map-node],[data-map-bar]")) setPinned(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(null);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  const interact = (node: MapNode): Interact => ({
    "data-map-node": "",
    onPointerEnter: (e) => {
      if (e.pointerType === "mouse") setHovered(node.id);
    },
    onPointerLeave: (e) => {
      if (e.pointerType === "mouse") setHovered((h) => (h === node.id ? null : h));
    },
    onFocus: () => setHovered(node.id),
    onBlur: () => setHovered((h) => (h === node.id ? null : h)),
    onClick: (e) => {
      // The keyboard's Enter opens a link straight away; focus already traced it.
      if (e.detail === 0 && node.href) return;
      if (pinned === node.id) {
        // Second click: open the link — or, with nothing to open, let go.
        if (!node.href) setPinned(null);
        return;
      }
      e.preventDefault();
      setPinned(node.id);
    },
  });

  const dim = (id: string) => lit !== null && !lit.has(id);
  const techShown = data.tech.filter((t, i) => wide || allTech || i < data.techInGraph || lit?.has(t.id));
  const hiddenTech = data.tech.length - techShown.length;
  // At rest a phone draws only the homes' beams; a selection draws its own.
  const drawn = wide ? paths : paths.filter((p) => (lit ? lit.has(p.from) && lit.has(p.to) : p.from.startsWith("home:")));

  return (
    <>
      <SelectionBar
        node={active ? (byId.get(active) ?? null) : null}
        lit={lit}
        byId={byId}
        pinned={pinned !== null}
        wide={wide}
        onClear={() => {
          setPinned(null);
          setHovered(null);
        }}
      />

      <div
        ref={container}
        className="relative grid grid-cols-1 gap-y-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.55fr)] lg:gap-x-14 lg:gap-y-0 xl:gap-x-20"
      >
        <svg aria-hidden="true" width={size.w} height={size.h} className={cn("pointer-events-none absolute inset-0 overflow-visible", !onScreen && "[&_path]:[animation-play-state:paused]")}>
          {drawn.map((p, i) => {
            const on = !lit || (lit.has(p.from) && lit.has(p.to));
            return (
              <g key={`${p.from}>${p.to}`} className="transition-opacity duration-300" style={{ opacity: on ? 1 : 0.1 }}>
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

        <Column title="GitHub homes" count={data.homes.length} className="max-lg:grid max-lg:grid-cols-2 max-lg:gap-2.5">
          {data.homes.map((n) => (
            <NodeCard key={n.id} node={n} register={register} dim={dim(n.id)} selected={pinned === n.id} {...interact(n)} />
          ))}
        </Column>
        <Column title="The work" count={data.work.length} className="max-lg:grid max-lg:grid-cols-2 max-lg:gap-2.5">
          {data.work.map((n) => (
            <NodeCard key={n.id} node={n} register={register} dim={dim(n.id)} selected={pinned === n.id} phoneCompact {...interact(n)} />
          ))}
        </Column>
        <Column title="Built with" count={data.tech.length} note={RANKING}>
          {data.tech.length > 0 ? (
            // Every technology the work uses — never dropped, every one joined to its work.
            <>
              <ul className="flex flex-wrap content-center items-center gap-1.5">
                {techShown.map((t) => {
                  const lead = data.tech.indexOf(t) < data.techInGraph;
                  const on = active === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        ref={register(t.id)}
                        title={t.sub}
                        aria-pressed={pinned === t.id}
                        {...interact(t)}
                        className={cn(
                          "focus-visible:outline-ember bg-night/85 relative z-10 inline-flex items-center gap-1.5 rounded-full border transition-[opacity,border-color,background-color] duration-300 focus-visible:outline-2",
                          lead ? "text-paper px-3 py-1.5 text-[13px] font-medium" : "text-mist px-2.5 py-1 text-[11.5px]",
                          pinned === t.id ? "border-ember bg-ember/15" : on ? "border-ember/70" : lead ? "border-white/15 hover:border-ember/50" : "border-white/10 hover:border-ember/50",
                          dim(t.id) && "opacity-30",
                        )}
                      >
                        {techMark(t.label)}
                        {t.label}
                        <span className={cn("type-data text-[10.5px]", on ? "text-ember" : "text-line")}>{t.sub?.split(" ")[0]}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {/* Phones: the most used lead; the rest are a tap away, never dropped. */}
              {!wide && (hiddenTech > 0 || allTech) && (
                <button
                  type="button"
                  data-map-bar=""
                  onClick={() => setAllTech((v) => !v)}
                  className="text-mist hover:text-paper focus-visible:outline-ember mt-1 inline-flex h-10 items-center self-start rounded-full border border-dashed border-white/15 px-4 text-[13px] focus-visible:outline-2"
                >
                  {allTech ? "Show the most used" : `Show all ${data.tech.length} — ${hiddenTech} more`}
                </button>
              )}
            </>
          ) : (
            <p className="text-mist text-sm">Technologies appear here as systems are curated.</p>
          )}
        </Column>
      </div>
    </>
  );
}

/**
 * Above the drawing: how to use it at rest; once something is traced, what it
 * is, what it connects to, a way to open it and a way back. Sticky on a phone,
 * so it stays in reach while the beams run down the page.
 */
function SelectionBar({
  node,
  lit,
  byId,
  pinned,
  wide,
  onClear,
}: {
  node: MapNode | null;
  lit: Set<string> | null;
  byId: Map<string, MapNode>;
  pinned: boolean;
  wide: boolean;
  onClear: () => void;
}) {
  const count = (kind: MapNode["kind"]) => [...(lit ?? [])].filter((id) => id !== node?.id && byId.get(id)?.kind === kind).length;
  const summary = !node
    ? ""
    : node.kind === "home"
      ? [plural(count("work"), "project", "projects"), plural(count("tech"), "technology", "technologies")].join(" · ")
      : node.kind === "work"
        ? [count("home") ? `in ${byId.get([...lit!].find((id) => byId.get(id)?.kind === "home")!)?.label}` : null, plural(count("tech"), "technology", "technologies")].filter(Boolean).join(" · ")
        : [`used in ${plural(count("work"), "project", "projects")}`, plural(count("home"), "home", "homes")].join(" · ");
  const verb = wide ? "Click" : "Tap";

  return (
    <div data-map-bar="" aria-live="polite" className="sticky top-20 z-20 mb-8 lg:static lg:mb-10">
      <div
        className={cn(
          "bg-night/85 flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-[0_16px_40px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl transition-colors duration-300",
          node ? "border-ember/40" : "border-white/10",
        )}
      >
        {node ? (
          <>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
              {node.kind === "home" ? <Github aria-hidden="true" className="text-ember size-4" /> : node.kind === "tech" ? techMark(node.label) : <FolderGit2 aria-hidden="true" className="text-ember size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-paper block truncate text-sm font-semibold">{node.label}</span>
              <span className="text-mist block truncate text-[12px]">{summary}</span>
            </span>
            {node.href && (
              <a
                href={node.href}
                {...(node.external && { target: "_blank", rel: "noopener noreferrer" })}
                className="bg-ember text-night focus-visible:outline-ember inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Open <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </a>
            )}
            {pinned && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Clear the selection"
                className="text-mist hover:text-paper focus-visible:outline-ember inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/12 focus-visible:outline-2"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
          </>
        ) : (
          <>
            <MousePointerClick aria-hidden="true" className="text-ember size-4 shrink-0" />
            <span className="text-mist text-[13px]">
              {verb} anything to trace its connections — {verb.toLowerCase()} it again to open it.
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function Column({ title, count, note, className, children }: { title: string; count?: number; note?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("relative flex flex-col justify-center gap-3", className)}>
      <p className="text-mist mb-1 flex items-baseline justify-between gap-3 font-mono text-[11px] tracking-[0.14em] uppercase max-lg:col-span-full max-lg:mb-0 max-lg:border-b max-lg:border-white/10 max-lg:pb-2">
        {title}
        {count !== undefined && <span className="type-data text-line tracking-normal lg:hidden">{count}</span>}
      </p>
      {note && <p className="text-line -mt-3 mb-1 text-[11px] max-lg:col-span-full max-lg:-mt-1">{note}</p>}
      {children}
    </div>
  );
}

function NodeCard({
  node,
  register,
  dim = false,
  selected = false,
  phoneCompact = false,
  ...events
}: {
  node: MapNode;
  register?: (id: string) => (el: HTMLElement | null) => void;
  dim?: boolean;
  selected?: boolean;
  /** Two to a row on a phone: the second line waits for wide screens. */
  phoneCompact?: boolean;
} & Partial<Interact>) {
  const icon =
    node.kind === "home" ? <Github aria-hidden="true" className="text-ember size-4 shrink-0" /> : node.kind === "work" && node.faint ? <FolderGit2 aria-hidden="true" className="text-line size-4 shrink-0" /> : null;
  const body = (
    <>
      {node.kind === "work" && !node.faint && node.colorToken && (
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: `var(--color-${node.colorToken}-on-dark, var(--color-${node.colorToken}))` }} />
      )}
      {icon}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate", node.kind === "home" ? "text-paper text-[15px] font-semibold max-lg:text-sm" : node.faint ? "text-mist text-sm max-lg:text-[13px]" : "text-paper text-sm font-medium max-lg:text-[13px]")}>
          {node.label}
        </span>
        {node.sub && <span className={cn("text-line truncate text-[11px]", phoneCompact ? "hidden lg:block" : "block")}>{node.sub}</span>}
      </span>
      {node.href && <ArrowUpRight aria-hidden="true" className={cn("size-3.5 shrink-0 transition-colors", selected ? "text-ember" : "text-line group-hover/n:text-ember max-lg:hidden")} />}
    </>
  );
  const cls = cn(
    "group/n relative z-10 flex min-w-0 items-center gap-2.5 rounded-xl border px-3.5 transition-[opacity,border-color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember max-lg:min-h-12 max-lg:px-3",
    node.kind === "home" ? "py-3.5 max-lg:py-2.5" : "py-2.5 max-lg:py-2",
    node.faint ? "border-dashed border-white/12 bg-night/60" : "border-white/10 bg-night/85 hover:border-ember/50",
    selected && "border-ember bg-ember/10 shadow-[0_0_0_3px_rgb(255_91_31/0.15)]",
    dim && "opacity-30",
  );
  const ref = register?.(node.id);
  if (!node.href) {
    return (
      <button ref={ref} type="button" aria-pressed={selected} className={cn(cls, "w-full text-left")} {...events}>
        {body}
      </button>
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
