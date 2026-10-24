// components/home/orbit/OrbitStage.tsx
// The home hero's Orbit (D-069; the owner chose it and approved its review, 2026-10-24): every
// published system around the platform's core, one ring per home, its last 26 weeks of commits
// replayed as sparks. Each part has its own place and nothing overlaps another: on a desktop the
// hero's words keep the left, the stage the right, the instrument bar the foot; on a phone the words,
// then the stage in its own band, then the bar. Systems carry name plates (real buttons, see-through
// while they orbit); an opened system gets its own panel beside it (under it on a phone) and the
// panel steps from one system to the next. The hero's own words drive it: a technology in its stack
// lights the worlds built with it, its latest-commit line finds its world.
//
// The first paint is a still drawn on the server (OrbitPoster). The live scene (engine.ts) is
// downloaded only once the page has loaded, gone idle and the stage is on screen, so the words stay
// the page's largest paint; it stops off screen and in a hidden tab, and a browser without WebGL2
// keeps the still.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, RotateCcw, X } from "lucide-react";
import type { OrbitData } from "@/lib/queries/orbit";
import { fillIn, type OrbitCopy } from "@/lib/home/orbit-copy";
import type { OrbitEngine, OrbitFrame, OrbitLayout } from "@/components/home/orbit/engine";
import { OrbitPoster } from "@/components/home/orbit/OrbitPoster";
import { cn } from "@/lib/utils";

const DESKTOP = "(min-width: 1024px)";
const fmtWeek = (iso: string, year = true) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(year && { year: "numeric" }),
    timeZone: "UTC",
  });
const n0 = (n: number) => n.toLocaleString("en-ZA");

export function OrbitStage({
  data,
  copy,
  weekMs,
  overPhoto = false,
}: {
  data: OrbitData;
  copy: OrbitCopy;
  weekMs: number;
  /** The hero's cover photo is behind it (owner, 2026-10-24: keep it): the sky goes quieter and the stage clear. */
  overPhoto?: boolean;
}) {
  const homeLabels = data.homes;
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const leaders = useRef<SVGSVGElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const plates = useRef<(HTMLButtonElement | null)[]>([]);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const hudL = useRef<HTMLSpanElement>(null);
  const hudR = useRef<HTMLSpanElement>(null);
  const blooms = useRef<(HTMLDivElement | null)[]>([]); // core bloom, inner bloom, streak, nebula
  const engine = useRef<OrbitEngine | null>(null);
  const [live, setLive] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const openRef = useRef<number | null>(null);
  const relayout = useRef<(() => void) | null>(null);
  // the desktop hint: shown while the pointer is over the orbit's zone, gone for good once it has been used
  const [hint, setHint] = useState(false);
  const used = useRef(false);

  const sys = data.systems;
  const totals = useMemo(() => sys.map((s) => s.weeks.reduce((a, b) => a + b, 0)), [sys]);
  const recent = useMemo(() => sys.map((s) => s.weeks.slice(-6).reduce((a, b) => a + b, 0)), [sys]);
  const all = totals.reduce((a, b) => a + b, 0);
  const weekTotals = useMemo(
    () => data.weeks.map((_, i) => sys.reduce((a, s) => a + (s.weeks[i] ?? 0), 0)),
    [data.weeks, sys]
  );
  const maxWeek = Math.max(1, ...weekTotals);
  // Each system's busiest week, for the line the replay shows as it passes (computed, never written).
  const busiest = useMemo(() => {
    const byWeek = new Map<number, number>();
    sys.forEach((s, i) => {
      const top = Math.max(...s.weeks);
      if (top <= 0) return;
      const w = s.weeks.indexOf(top);
      const cur = byWeek.get(w);
      if (cur === undefined || top > sys[cur]!.weeks[w]!) byWeek.set(w, i);
    });
    return byWeek;
  }, [sys]);
  const counts = { systems: sys.length, homes: data.homes.length, commits: n0(all) };
  // What the panel says about a system — only what its own page doesn't (owner, 2026-10-24): its busiest
  // week, its share of all the commits replayed, and the systems it shares its stack with.
  const facts = sys.map((w, i) => {
    const top = Math.max(0, ...w.weeks);
    const linked = sys
      .filter((o, j) => j !== i && o.stack.filter((t) => w.stack.includes(t)).length >= 2)
      .map((o) => o.name);
    return {
      busiest: top > 0 ? { week: data.weeks[w.weeks.indexOf(top)]!, commits: top } : null,
      share: all > 0 ? Math.round((totals[i]! / all) * 100) : 0,
      linked,
    };
  });

  const openWorld = useCallback(
    (i: number | null) => {
      openRef.current = i;
      setOpen(i);
      engine.current?.focus(i);
      relayout.current?.();
      try {
        const url = new URL(location.href);
        if (i === null) url.searchParams.delete("system");
        else url.searchParams.set("system", sys[i]!.slug);
        history.replaceState(history.state, "", url);
      } catch {
        // the address bar is a convenience
      }
      if (i !== null && !matchMedia(DESKTOP).matches)
        stage.current?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
    },
    [sys]
  );

  // ---- placing the plates so nothing overlaps: the words, the header's corner, the panel, the edges, each other
  const sizes = useRef<{ w: number; h: number }[]>([]);
  const placed = useRef<{ x: number | null; y: number | null; cand: number }[]>(
    sys.map(() => ({ x: null, y: null, cand: 0 }))
  );
  const measure = useCallback(() => {
    sizes.current = plates.current.map((p) => ({
      w: p?.offsetWidth ?? 0,
      h: p?.offsetHeight ?? 0,
    }));
  }, []);
  const hoverRef = useRef<number | null>(null);
  const copyRef = useRef<Element | null>(null);
  useEffect(() => {
    copyRef.current = root.current?.closest("section")?.querySelector("[data-orbit-copy]") ?? null;
  }, []);
  const techRef = useRef<string | null>(null);

  // ---- boot: after load, when idle, once the stage is on screen
  useEffect(() => {
    const st = stage.current,
      cv = canvas.current;
    if (!st || !cv) return;
    let lighter = false;
    let cancelled = false,
      booting = false,
      onScreen = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Each frame: place the plates, draw their leaders and the panel's thread, move the lens, update the bar.
    const onFrame = (f: OrbitFrame) => {
      const st = stage.current,
        svg = leaders.current;
      if (!st || !svg) return;
      const sr = st.getBoundingClientRect();
      const rel = (el: Element) => {
        const r = el.getBoundingClientRect();
        return [r.left - sr.left, r.top - sr.top, r.right - sr.left, r.bottom - sr.top] as const;
      };
      const hit = (a: readonly number[], b: readonly number[]) =>
        a[0]! < b[2]! && a[2]! > b[0]! && a[1]! < b[3]! && a[3]! > b[1]!;
      const desktop = matchMedia(DESKTOP).matches;
      const blocks: (readonly number[])[] = [];
      const copyEl = copyRef.current;
      if (desktop && copyEl) {
        const c = rel(copyEl);
        blocks.push([c[0], c[1], c[2] - 16, c[3]]);
        blocks.push([sr.width - 380, -10, sr.width, 84]);
      }
      const opened = openRef.current;
      // Every read happens before any write, so the browser lays the page out once per frame.
      const cardBox = opened !== null && card.current ? rel(card.current) : null;
      if (cardBox)
        blocks.push([cardBox[0] - 10, cardBox[1] - 10, cardBox[2] + 10, cardBox[3] + 10]);
      const lit = opened ?? hoverRef.current;
      const tech = techRef.current;
      const byTech = (i: number) => tech !== null && sys[i]!.stack.includes(tech);
      const want = sys
        .map((_, i) => i)
        .filter((i) => i === lit || byTech(i) || (sys[i]!.flagship && (desktop || opened === null)))
        .filter((i) => desktop || opened === null || i === opened)
        .sort(
          (a, b) =>
            Number(b === lit) - Number(a === lit) ||
            Number(byTech(b)) - Number(byTech(a)) ||
            f.worlds[b]!.r - f.worlds[a]!.r
        );
      const taken: number[][] = [];
      const show = new Set<number>();
      for (const i of want) {
        const o = f.worlds[i]!,
          s = sizes.current[i] ?? { w: 0, h: 0 },
          gap = o.r + 16;
        if (!s.w) continue;
        const cands: [number, number][] = [
          [o.x + gap, o.y - s.h / 2],
          [o.x - gap - s.w, o.y - s.h / 2],
          [o.x - s.w / 2, o.y - gap - s.h],
          [o.x - s.w / 2, o.y + gap],
          [o.x + gap * 0.7, o.y - gap * 0.7 - s.h],
          [o.x - gap * 0.7 - s.w, o.y + gap * 0.7],
        ];
        const pl = placed.current[i]!;
        for (const ci of [pl.cand, 0, 1, 2, 3, 4, 5]) {
          const [x, y] = cands[ci]!;
          const box = [x, y, x + s.w, y + s.h];
          if (x < 10 || y < 10 || x + s.w > sr.width - 10 || y + s.h > sr.height - 10) continue;
          if (blocks.some((b) => hit(box, b)) || taken.some((b) => hit(box, b))) continue;
          pl.cand = ci;
          pl.x = pl.x === null ? x : pl.x + (x - pl.x) * 0.3;
          pl.y = pl.y === null ? y : pl.y + (y - pl.y) * 0.3;
          taken.push([x - 6, y - 6, x + s.w + 6, y + s.h + 6]);
          show.add(i);
          break;
        }
      }
      let d = "";
      plates.current.forEach((p, i) => {
        if (!p) return;
        const pl = placed.current[i]!,
          vis = show.has(i) && f.grown;
        p.style.opacity = vis ? "1" : "0";
        p.style.pointerEvents = vis ? "auto" : "none";
        p.tabIndex = vis ? 0 : -1;
        if (pl.x !== null)
          p.style.transform = `translate(${pl.x.toFixed(1)}px, ${pl.y!.toFixed(1)}px)`;
        if (vis) {
          const o = f.worlds[i]!,
            s = sizes.current[i]!;
          const cx = Math.max(pl.x!, Math.min(pl.x! + s.w, o.x)),
            cy = Math.max(pl.y!, Math.min(pl.y! + s.h, o.y));
          const dx = cx - o.x,
            dy = cy - o.y,
            l = Math.hypot(dx, dy) || 1;
          if (l > o.r + 8)
            d += `M${(o.x + (dx / l) * (o.r + 4)).toFixed(1)},${(o.y + (dy / l) * (o.r + 4)).toFixed(1)}L${cx.toFixed(1)},${cy.toFixed(1)}`;
        }
      });
      const lead = svg.querySelector("[data-lead]")!,
        conn = svg.querySelector("[data-conn]")!,
        dot = svg.querySelector("[data-dot]")!;
      lead.setAttribute("d", d);
      if (opened !== null && cardBox) {
        const c = cardBox,
          o = f.worlds[opened]!;
        const tx = desktop ? c[0] : (c[0] + c[2]) / 2,
          ty = desktop ? (c[1] + c[3]) / 2 : c[1];
        const dx = tx - o.x,
          dy = ty - o.y,
          l = Math.hypot(dx, dy) || 1;
        conn.setAttribute(
          "d",
          `M${(o.x + (dx / l) * (o.r + 6)).toFixed(1)},${(o.y + (dy / l) * (o.r + 6)).toFixed(1)}L${tx.toFixed(1)},${ty.toFixed(1)}`
        );
        dot.setAttribute("cx", tx.toFixed(1));
        dot.setAttribute("cy", ty.toFixed(1));
        svg.dataset.conn = "on";
      } else svg.dataset.conn = "off";

      // the lens follows the core
      const glow = (0.6 + f.core.flash * 0.4) * (opened !== null ? 0.6 : 1);
      blooms.current.forEach((b, k) => {
        if (!b) return;
        if (k === 3) {
          // the Orbit's own ground: a dark, ember-lit field under it, so its colours own its space over the photo
          b.style.transform = `translate(${f.core.x}px, ${f.core.y}px) scale(${f.core.scale})`;
          b.style.opacity = "1";
          return;
        }
        b.style.transform = `translate(${f.core.x}px, ${f.core.y}px) ${k === 2 ? `scaleX(${f.core.scale})` : `scale(${f.core.scale})`}`;
        b.style.opacity = String(
          k === 2 ? (0.5 + f.core.flash * 0.5) * (opened !== null ? 0.4 : 1) : glow
        );
      });

      // the instrument bar
      bars.current.forEach((b, i) => {
        if (!b) return;
        b.dataset.state =
          i === f.week ? "cur" : f.phase === "idle" || (f.week >= 0 && i < f.week) ? "past" : "";
      });
      let left = "";
      if (f.phase === "arrive") left = copy.ignitingLine ?? "";
      else if (f.phase === "replay" && f.week >= 0) {
        const peak = busiest.get(f.week);
        left =
          (peak !== undefined &&
            fillIn(copy.busiestLine, {
              week: fmtWeek(data.weeks[f.week]!, false),
              system: sys[peak]!.name,
              commits: n0(sys[peak]!.weeks[f.week]!),
            })) ||
          fillIn(copy.weekLine, {
            week: fmtWeek(data.weeks[f.week]!),
            commits: n0(weekTotals[f.week]!),
          }) ||
          "";
      } else left = copy.restLine ?? "";
      if (hudL.current && hudL.current.textContent !== left) hudL.current.textContent = left;
      const right = `${n0(f.sent)} / ${n0(all)}`;
      if (hudR.current && hudR.current.textContent !== right) hudR.current.textContent = right;
    };
    const layout = (): OrbitLayout => {
      const r = st.getBoundingClientRect();
      if (!matchMedia(DESKTOP).matches)
        return {
          cx: 0.5,
          cy: openRef.current !== null ? 0.36 : 0.5,
          ringPx: Math.min(r.width, r.height) * (openRef.current !== null ? 0.4 : 0.5),
          focusX: 0.5,
          focusY: 0.36,
          minCoreX: 0,
        };
      const copyEl = root.current?.closest("section")?.querySelector("[data-orbit-copy]");
      const left = copyEl ? copyEl.getBoundingClientRect().right - r.left : r.width * 0.45;
      const zone = Math.max(240, r.width - left - 32);
      const cx = (left + zone / 2) / r.width;
      return {
        cx,
        cy: 0.5,
        ringPx: Math.min(zone * 0.56, r.height * 0.5),
        focusX: Math.max(0.3, (cx * r.width - 220) / r.width),
        focusY: 0.5,
        // the core is never carried into the words' column
        minCoreX: (left + 90) / r.width,
      };
    };
    relayout.current = resize_;
    const quality = () =>
      (navigator.hardwareConcurrency || 8) <= 4 ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4 ||
      !matchMedia(DESKTOP).matches ||
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
        ? 0.5
        : 1;
    function resize_() {
      resize();
    }
    const resize = () => {
      const e = engine.current;
      measure();
      if (!e) return;
      const r = st.getBoundingClientRect();
      e.resize(
        r.width,
        r.height,
        Math.min(devicePixelRatio || 1, lighter ? 1 : quality() < 1 ? 1.25 : 1.5),
        layout()
      );
    };
    const boot = async () => {
      if (booting) return;
      booting = true;
      const { createOrbit } = await import("@/components/home/orbit/engine");
      if (cancelled) return;
      const e = await createOrbit(cv, data, {
        reduced,
        quality: quality(),
        weekMs,
        sky: overPhoto ? 0.3 : 1,
        onFrame,
        // a device that can't keep up: a lighter scene first, then the still (the page never freezes)
        onSlow: (level) => {
          if (level === "lighter") {
            lighter = true;
            resize();
          } else setLive(false); // paused on the still; a touch, a click or coming back to it resumes (onResume)
        },
        onResume: () => setLive(true),
      });
      if (cancelled) return e?.destroy();
      if (!e) return; // no WebGL2: the still stays
      engine.current = e;
      const latest = root.current
        ?.closest("section")
        ?.querySelector<HTMLElement>("[data-orbit-system]")?.dataset.orbitSystem;
      const bi = latest ? sys.findIndex((s) => s.slug === latest) : -1;
      e.beacon(bi >= 0 ? bi : null);
      resize();
      e.focus(openRef.current);
      if (onScreen && !document.hidden) e.start();
      setLive(true);
    };
    const io = new IntersectionObserver(([en]) => {
      onScreen = Boolean(en?.isIntersecting);
      if (onScreen && !engine.current) void boot();
      else if (onScreen && !document.hidden) engine.current?.start();
      else engine.current?.stop();
    });
    const begin = () => {
      const go = () => !cancelled && io.observe(st);
      if ("requestIdleCallback" in window) window.requestIdleCallback(go, { timeout: 2500 });
      else setTimeout(go, 1200);
    };
    if (document.readyState === "complete") begin();
    else addEventListener("load", begin, { once: true });
    const lost = (e: Event) => {
      e.preventDefault(); // ask the browser to restore it
      engine.current?.destroy();
      engine.current = null;
      booting = false;
      setLive(false);
    };
    const restored = () => {
      if (onScreen) void boot();
    };
    cv.addEventListener("webglcontextlost", lost);
    cv.addEventListener("webglcontextrestored", restored);
    // a touch or click on a paused still brings the scene back
    const wake = () => {
      if (engine.current) engine.current.start();
    };
    st.addEventListener("pointerdown", wake);
    const vis = () =>
      document.hidden ? engine.current?.stop() : onScreen && engine.current?.start();
    document.addEventListener("visibilitychange", vis);
    const ro = new ResizeObserver(resize);
    ro.observe(st);
    void document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
      io.disconnect();
      ro.disconnect();
      removeEventListener("load", begin);
      document.removeEventListener("visibilitychange", vis);
      cv.removeEventListener("webglcontextlost", lost);
      cv.removeEventListener("webglcontextrestored", restored);
      st.removeEventListener("pointerdown", wake);
      engine.current?.destroy();
      engine.current = null;
    };
  }, [all, busiest, copy, data, measure, openWorld, overPhoto, sys, weekMs, weekTotals]);

  // ---- a shared link (?system=…) opens its system — with or without the live scene
  useEffect(() => {
    const wanted = new URL(location.href).searchParams.get("system");
    const i = wanted ? sys.findIndex((s) => s.slug === wanted) : -1;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the address bar is outside React: read once, on arrival
    if (i >= 0) openWorld(i);
  }, [openWorld, sys]);

  // ---- the hero's own words drive it: its stack lights worlds, its latest-commit line finds its world
  useEffect(() => {
    const section = root.current?.closest("section");
    if (!section) return;
    const over = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-orbit-tech],[data-orbit-system]"
      );
      if (!t) return;
      if (t.dataset.orbitTech) {
        techRef.current = t.dataset.orbitTech;
        engine.current?.tech(t.dataset.orbitTech);
      } else if (t.dataset.orbitSystem) {
        const i = sys.findIndex((s) => s.slug === t.dataset.orbitSystem);
        hoverRef.current = i >= 0 ? i : null;
        engine.current?.hover(hoverRef.current);
      }
    };
    const out = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-orbit-tech],[data-orbit-system]"
      );
      if (!t) return;
      if (t.dataset.orbitTech) {
        techRef.current = null;
        engine.current?.tech(null);
      } else {
        hoverRef.current = null;
        engine.current?.hover(null);
      }
    };
    section.addEventListener("pointerover", over);
    section.addEventListener("pointerout", out);
    section.addEventListener("focusin", over);
    section.addEventListener("focusout", out);
    return () => {
      section.removeEventListener("pointerover", over);
      section.removeEventListener("pointerout", out);
      section.removeEventListener("focusin", over);
      section.removeEventListener("focusout", out);
    };
  }, [sys]);

  // ---- pointer on the stage: drag to turn (with inertia), click or tap a world to open it
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    // A mouse drags any way (round, over the top, upside down). On a phone one finger turns it sideways and
    // leaves the page free to scroll; two fingers turn it any way and pinch to zoom. A double click or tap resets.
    let down: { x: number; y: number; moved: boolean; lastX: number; lastY: number; touch: boolean } | null = null;
    const touches = new Map<number, { x: number; y: number }>();
    let pinch: { d: number; cx: number; cy: number } | null = null;
    let lastTap = 0;
    const local = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const two = () => {
      const [p, q] = [...touches.values()];
      return { d: Math.hypot(p!.x - q!.x, p!.y - q!.y), cx: (p!.x + q!.x) / 2, cy: (p!.y + q!.y) / 2 };
    };
    const onDown = (e: PointerEvent) => {
      const [x, y] = local(e);
      if (e.pointerType !== "mouse") {
        touches.set(e.pointerId, { x, y });
        if (touches.size === 2) { pinch = two(); down = null; return; }
      }
      down = { x, y, moved: false, lastX: x, lastY: y, touch: e.pointerType !== "mouse" };
    };
    const onMove = (e: PointerEvent) => {
      const [x, y] = local(e),
        en = engine.current;
      if (!en) return;
      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x, y });
      if (pinch && touches.size === 2) {
        const now = two();
        en.turn((now.cx - pinch.cx) * 0.007, (now.cy - pinch.cy) * 0.007);
        if (now.d > 10 && pinch.d > 10) en.zoom(pinch.d / now.d);
        pinch = now;
        return;
      }
      if (e.pointerType === "mouse" && !used.current) {
        const zone = copyRef.current ? copyRef.current.getBoundingClientRect().right - cv.getBoundingClientRect().left : 0;
        setHint(x > zone + 24);
      }
      if (down) {
        if (Math.abs(x - down.x) + Math.abs(y - down.y) > 6) {
          down.moved = true;
          used.current = true;
          setHint(false);
        }
        if (down.moved) {
          en.turn((x - down.lastX) * 0.0068, down.touch ? 0 : (y - down.lastY) * 0.0068);
          down.lastX = x;
          down.lastY = y;
        }
      } else if (e.pointerType === "mouse") {
        const h = en.pick(x, y, false);
        hoverRef.current = h;
        en.hover(h);
        cv.style.cursor = h !== null ? "pointer" : "grab";
      }
    };
    const onUp = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch = null;
      if (!down) return;
      const was = down;
      down = null;
      if (was.moved) return;
      const [x, y] = local(e);
      const h = engine.current?.pick(x, y, was.touch) ?? null;
      const now = performance.now();
      if (h === null && now - lastTap < 320) { engine.current?.reset(); lastTap = 0; return; }
      lastTap = now;
      used.current = true;
      setHint(false);
      openWorld(h !== null ? h : null);
    };
    const onCancel = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch = null;
      down = null;
    };
    const onLeave = () => {
      setHint(false);
      if (!down) {
        hoverRef.current = null;
        engine.current?.hover(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openRef.current !== null) openWorld(null);
    };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onCancel);
    cv.addEventListener("pointerleave", onLeave);
    addEventListener("keydown", onKey);
    return () => {
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onCancel);
      cv.removeEventListener("pointerleave", onLeave);
      removeEventListener("keydown", onKey);
    };
  }, [openWorld]);

  const step = (by: number) => {
    if (open === null) return;
    openWorld((open + by + sys.length) % sys.length);
  };
  const s = open !== null ? sys[open]! : null;
  const f = open !== null ? facts[open]! : null;

  return (
    <div
      ref={root}
      className="ks-orbit"
      data-open={open !== null ? "" : undefined}
      data-live={live ? "" : undefined}
      data-over-photo={overPhoto ? "" : undefined}
    >
      <div ref={stage} className="orbit-stage" data-hint={hint ? "" : undefined}>
        {/* How to play with it: a heading over the orbit on a phone; on a desktop only while the pointer is over the orbit, until it's used. */}
        {copy.touchHint && <p className="orbit-hint orbit-hint-touch">{copy.touchHint}</p>}
        {copy.pointerHint && <p className="orbit-hint orbit-hint-pointer" aria-hidden="true">{copy.pointerHint}</p>}
        <div
          ref={(el) => {
            blooms.current[3] = el;
          }}
          className="orbit-nebula"
          aria-hidden="true"
        />
        <div className="orbit-poster-wrap" aria-hidden="true">
          <OrbitPoster data={data} />
        </div>
        <div
          ref={(el) => {
            blooms.current[0] = el;
          }}
          className="orbit-bloom orbit-bloom-1"
          aria-hidden="true"
        />
        <div
          ref={(el) => {
            blooms.current[1] = el;
          }}
          className="orbit-bloom orbit-bloom-2"
          aria-hidden="true"
        />
        <div
          ref={(el) => {
            blooms.current[2] = el;
          }}
          className="orbit-bloom orbit-streak"
          aria-hidden="true"
        />
        <canvas
          ref={canvas}
          className="orbit-canvas"
          role="img"
          aria-label={fillIn(copy.ariaLabel, counts) ?? undefined}
        />
        <div className="orbit-shade" aria-hidden="true" />
        <svg ref={leaders} className="orbit-leaders" aria-hidden="true" data-conn="off">
          <path data-lead="" />
          <path data-conn="" className="orbit-conn" />
          <circle data-dot="" r="2.5" />
        </svg>
        <div className="orbit-plates">
          {sys.map((w, i) => (
            <button
              key={w.slug}
              ref={(el) => {
                plates.current[i] = el;
              }}
              type="button"
              tabIndex={-1}
              className={cn(
                "orbit-plate",
                w.flagship && "orbit-plate-flag",
                open === i && "orbit-plate-on"
              )}
              aria-label={`${w.name}, ${homeLabels[w.home] ?? ""}, ${w.status}`}
              onClick={() => openWorld(open === i ? null : i)}
              onPointerEnter={() => {
                hoverRef.current = i;
                engine.current?.hover(i);
              }}
              onPointerLeave={() => {
                if (hoverRef.current === i) {
                  hoverRef.current = null;
                  engine.current?.hover(null);
                }
              }}
            >
              <i
                className={cn("orbit-orb", recent[i]! > 0 && "orbit-orb-live")}
                aria-hidden="true"
              />
              <b>{w.name}</b>
            </button>
          ))}
        </div>

        {/* The opened system: a small panel in the stage's corner, the whole orbit still in view. */}
        <div
          ref={card}
          className="orbit-card"
          data-open={s ? "true" : "false"}
          {...(s
            ? { role: "dialog", "aria-modal": false, "aria-labelledby": "orbit-card-title" }
            : { "aria-hidden": true })}
        >
          {s && f && open !== null && (
            <>
              <p className="orbit-card-k">
                {s.flagship && copy.flagshipLabel ? `${copy.flagshipLabel} · ` : ""}
                {homeLabels[s.home]}
              </p>
              <h3 id="orbit-card-title" className="orbit-card-name">
                {s.name}
              </h3>
              <dl className="orbit-facts">
                {f.busiest
                  ? copy.factBusiest && (
                      <div>
                        <dt>{copy.factBusiest}</dt>
                        <dd>
                          {fillIn(copy.busiestValue, {
                            week: fmtWeek(f.busiest.week, false),
                            commits: n0(f.busiest.commits),
                          })}
                        </dd>
                      </div>
                    )
                  : copy.factQuiet && (
                      <div>
                        <dt>{copy.factBusiest}</dt>
                        <dd>{copy.factQuiet}</dd>
                      </div>
                    )}
                {copy.factShare && f.busiest && (
                  <div>
                    <dt>{copy.factShare}</dt>
                    <dd>{fillIn(copy.shareValue, { percent: f.share, total: n0(all) })}</dd>
                  </div>
                )}
                {copy.factLinked && f.linked.length > 0 && (
                  <div>
                    <dt>{copy.factLinked}</dt>
                    <dd>
                      {f.linked.slice(0, 3).join(", ")}
                      {f.linked.length > 3 ? ` +${f.linked.length - 3}` : ""}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="orbit-card-foot">
                {copy.openLabel && (
                  <a href={`/systems/${s.slug}`} className="orbit-go">
                    {copy.openLabel}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </a>
                )}
                {sys.length > 1 && (
                  <span className="orbit-step">
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      aria-label={copy.prevLabel ?? undefined}
                    >
                      ‹
                    </button>
                    <span>
                      {open + 1}/{sys.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      aria-label={copy.nextLabel ?? undefined}
                    >
                      ›
                    </button>
                  </span>
                )}
              </div>
              {/* Last in the panel and above its lines, so nothing paints over it. */}
              <button
                type="button"
                className="orbit-x"
                onClick={() => openWorld(null)}
                aria-label={copy.closeLabel ?? undefined}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        <div className="orbit-grain" aria-hidden="true" />
      </div>

      {/* One quiet line under the stage: the count, a way in, the 26 weeks and the replay. */}
      <div className="orbit-bar">
        <p className="orbit-stats">
          {copy.statsLine && <span>{fillIn(copy.statsLine, counts)}</span>}
          {copy.exploreLabel && (
            <button type="button" className="orbit-explore-inline" onClick={() => openWorld(0)}>
              {copy.exploreLabel}
            </button>
          )}
        </p>
        <div className="orbit-timeline">
          <div className="orbit-now">
            <span ref={hudL} aria-live="off">
              {copy.ignitingLine}
            </span>
            <span className="flex items-center gap-2">
              <span ref={hudR} className="text-paper">{`0 / ${n0(all)}`}</span>
              {copy.replayLabel && (
                <button
                  type="button"
                  className="orbit-again"
                  onClick={() => engine.current?.replay(0)}
                  aria-label={copy.replayLabel}
                  title={copy.replayLabel}
                  disabled={!live}
                >
                  <RotateCcw className="size-3" aria-hidden="true" />
                </button>
              )}
            </span>
          </div>
          {/* The weeks as bars; the strip replays from the week under a click or tap (the replay button is the keyboard's way). */}
          <div
            className="orbit-bars"
            data-live={live ? "" : undefined}
            onClick={(e) => {
              if (!live) return;
              const r = e.currentTarget.getBoundingClientRect();
              engine.current?.replay(
                Math.max(
                  0,
                  Math.min(
                    weekTotals.length - 1,
                    Math.floor(((e.clientX - r.left) / r.width) * weekTotals.length)
                  )
                )
              );
            }}
          >
            {weekTotals.map((v, i) => (
              <span
                key={data.weeks[i]}
                ref={(el) => {
                  bars.current[i] = el;
                }}
                title={
                  fillIn(copy.weekButton, { week: fmtWeek(data.weeks[i]!), commits: n0(v) }) ??
                  undefined
                }
              >
                <span style={{ height: `${Math.max(6, (v / maxWeek) * 100)}%` }} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
