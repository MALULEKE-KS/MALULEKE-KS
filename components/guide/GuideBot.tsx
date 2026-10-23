// components/guide/GuideBot.tsx
// The AI guide's own face (D-060, the owner's choice "B · Orb", 2026-10-24: "the
// ai icon not to be exactly my logo but … a robot bot floating"). The K-S cube
// is the owner's logo; the guide is not the owner — it reads his site and says
// so (BR-4.3), so it gets a face of its own. Owner: "make it look realistic and
// more real world premium and never ai generation related" — so it is drawn as a
// made object, not a glow: an anodised graphite shell under one key light (a
// soft highlight, a warm rim, a fine grain, the seam where its halves meet), a
// smoked-glass face with the eyes behind it as LEDs, a status light set into the
// shell, and a thin metal ring that passes behind it and in front, grounded by a
// contact shadow. No halo; ember is light, never paint.
//
// Every move says something true about the guide, from its real state:
//   idle       floats, blinks, its eyes follow the pointer
//   noticing   the pointer is on it: a quicker float, eyes on you
//   listening  the visitor is typing (mood "attentive"): eyes wide
//   thinking   sent, reading the site's data: eyes narrow, a light sweeps the
//              screen, the ring turns, the status light goes ember
//   answering  the answer streams in: the eyes become a level meter
//   done       one nod, smiling eyes, then idle
//   resting    today's questions are used up (the daily cap): eyes closed, a slow "z"
//   offline    no model: still and grey
//   error      a request failed: a small tilt
//   tap        a click or tap: a hop
// It glances at what the guide shows (the rig's lookAt). Reduced motion: no
// float, blink or sweep — the state shows through the eyes' shape and the status
// light only. Below 28 px ("sm") the ring and the "z" are left out.

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useGuide } from "@/components/guide/GuideProvider";
import { useGuideChat } from "@/components/guide/GuideChatProvider";
import { lookFrom, type Rig } from "@/components/guide/rig";
import { cn } from "@/lib/utils";

export type BotState = "idle" | "noticing" | "listening" | "thinking" | "answering" | "done" | "resting" | "offline" | "error" | "tap";

const DONE_MS = 900;
const TAP_MS = 520;

/** The guide's state as the bot shows it — from the chat and the guide's mood, never invented. */
function useBotState(): Exclude<BotState, "noticing" | "tap"> {
  const { ready, mood } = useGuide();
  const { busy, working, failure } = useGuideChat();
  const [done, setDone] = useState(false);
  const wasBusy = useRef(busy);
  useEffect(() => {
    const finished = wasBusy.current && !busy && !failure;
    wasBusy.current = busy;
    if (!finished) return;
    setDone(true); // eslint-disable-line react-hooks/set-state-in-effect -- the nod follows the answer finishing
    const t = setTimeout(() => setDone(false), DONE_MS);
    return () => clearTimeout(t);
  }, [busy, failure]);
  return botStateOf({ ready, mood, busy, working, failure, done });
}

/** The guide's real state → what the orb shows; the order is the priority (a failure outranks the rest). */
export function botStateOf(g: { ready: boolean; mood: string; busy: boolean; working: boolean; failure: { resting?: boolean } | null; done: boolean }): Exclude<BotState, "noticing" | "tap"> {
  if (!g.ready) return "offline";
  if (g.failure) return g.failure.resting ? "resting" : "error";
  if (g.working) return "thinking";
  if (g.busy) return "answering";
  if (g.done) return "done";
  if (g.mood === "attentive") return "listening";
  return "idle";
}

export function GuideBot({ className, size = "md", interactive = true }: { className?: string; size?: "sm" | "md"; /** Follows the pointer, notices and hops on taps. Off inside buttons that do their own thing. */ interactive?: boolean }) {
  const base = useBotState();
  const { registerRig } = useGuide();
  const [hover, setHover] = useState(false);
  const [tap, setTap] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const id = useId().replace(/:/g, "");
  const state: BotState = tap ? "tap" : hover && base === "idle" ? "noticing" : base;
  const follows = state === "idle" || state === "noticing" || state === "done" || state === "listening";

  // Eyes follow the pointer — only while on screen, only with motion allowed, only in states that don't own the eyes.
  useEffect(() => {
    const el = svg.current;
    if (!el || !interactive || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = Boolean(e?.isIntersecting)));
    io.observe(el);
    const look = (x: number, y: number) => {
      if (!eyes.current) return;
      eyes.current.style.transform = `translate(${Math.max(-1, Math.min(1, x)) * 5}px, ${Math.max(-1, Math.min(1, y)) * 3}px)`;
    };
    const onMove = (e: PointerEvent) => {
      if (!visible || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        look((e.clientX - (r.left + r.width / 2)) / 300, (e.clientY - (r.top + r.height / 2)) / 300);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    // The guide glances at what it shows (a card, a page): the provider's lookAt reaches every registered rig.
    const rig: Rig = { setMood: () => {}, setLook: (x, y) => look(x, y), speak: () => {}, hush: () => {}, setRunning: () => {}, destroy: () => {} };
    const off = registerRig(rig, () => el.getBoundingClientRect());
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      off();
    };
  }, [interactive, registerRig]);

  useEffect(() => {
    if (!follows && eyes.current) eyes.current.style.transform = "";
  }, [follows]);

  useEffect(() => {
    if (!tap) return;
    const t = setTimeout(() => setTap(false), TAP_MS);
    return () => clearTimeout(t);
  }, [tap]);

  const status = state === "offline" ? "var(--color-line)" : state === "thinking" || state === "answering" ? "var(--color-ember)" : state === "resting" ? "var(--color-mist)" : state === "error" ? "var(--color-critical)" : "var(--color-signal-finished-on-dark)";

  const md = size === "md";
  const u = (name: string) => `url(#${id}-${name})`;
  return (
    <svg
      ref={svg}
      viewBox="0 0 120 120"
      aria-hidden="true"
      data-state={state}
      data-size={size}
      className={cn("guide-bot shrink-0 overflow-visible", className)}
      onPointerEnter={interactive ? () => setHover(true) : undefined}
      onPointerLeave={interactive ? () => setHover(false) : undefined}
      onPointerDown={interactive ? () => setTap(true) : undefined}
    >
      <defs>
        {/* Anodised graphite under one key light, top left. */}
        <radialGradient id={`${id}-shell`} cx=".36" cy=".3" r=".78">
          <stop offset="0" stopColor="#585e67" />
          <stop offset=".38" stopColor="#2a2d33" />
          <stop offset=".8" stopColor="#141619" />
          <stop offset="1" stopColor="#0c0d0f" />
        </radialGradient>
        {/* The warm light the room bounces back onto its lower edge. */}
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset=".55" stopColor="#ffb08a" stopOpacity="0" />
          <stop offset="1" stopColor="#ffb08a" stopOpacity=".42" />
        </linearGradient>
        {/* Smoked glass: a dark top edge, a lit lower lip. */}
        <linearGradient id={`${id}-glassEdge`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".22" />
        </linearGradient>
        <linearGradient id={`${id}-glare`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".16" />
          <stop offset=".5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Brushed metal for the ring: light, dark, light round its turn. */}
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9ced6" />
          <stop offset=".45" stopColor="#5c626b" />
          <stop offset=".7" stopColor="#9aa1ab" />
          <stop offset="1" stopColor="#3b4047" />
        </linearGradient>
        <clipPath id={`${id}-visor`}>
          <rect x="41" y="47" width="38" height="20" rx="10" />
        </clipPath>
        <clipPath id={`${id}-back`}>
          <rect x="0" y="0" width="120" height="60" />
        </clipPath>
        <clipPath id={`${id}-front`}>
          <rect x="0" y="60" width="120" height="60" />
        </clipPath>
        {md && (
          <>
            <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.4" />
            </filter>
            <filter id={`${id}-bloom`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
            {/* A fine grain, so the shell reads as a surface, not a gradient. */}
            <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0" />
              <feComposite in2="SourceGraphic" operator="in" />
            </filter>
          </>
        )}
      </defs>

      {md && <ellipse className="gb-shadow" cx="60" cy="108" rx="20" ry="3.6" fill="#000" opacity=".55" filter={u("soft")} />}

      <g className="gb-float">
        {md && <ellipse className="gb-under" cx="60" cy="92" rx="16" ry="4" fill="#ff5b1f" opacity="0" filter={u("soft")} />}

        {/* The ring's far half passes behind the orb. */}
        {md && (
          <g transform="rotate(-14 60 60)" clipPath={u("back")}>
            <ellipse cx="60" cy="60" rx="48" ry="12" fill="none" stroke={u("metal")} strokeWidth="2.2" opacity=".55" />
          </g>
        )}

        <circle cx="60" cy="58" r={md ? 30 : 40} fill={u("shell")} />
        {md && <circle cx="60" cy="58" r="30" fill="#fff" filter={u("grain")} />}
        <circle cx="60" cy="58" r={md ? 29.4 : 39.2} fill="none" stroke={u("rim")} strokeWidth={md ? 1.2 : 2} />
        {/* The seam where the two halves meet. */}
        {md && (
          <>
            <path d="M31.2 63 Q60 75 88.8 63" fill="none" stroke="#000" strokeOpacity=".55" strokeWidth=".8" />
            <path d="M31.4 63.9 Q60 75.9 88.6 63.9" fill="none" stroke="#fff" strokeOpacity=".07" strokeWidth=".6" />
          </>
        )}
        {/* Key-light highlight: a soft bloom and one crisp point. */}
        {md ? (
          <>
            <ellipse cx="48" cy="40" rx="11" ry="6.5" fill="#fff" opacity=".16" transform="rotate(-32 48 40)" filter={u("soft")} />
            <circle cx="45.5" cy="38.5" r="1.4" fill="#fff" opacity=".6" />
          </>
        ) : (
          <ellipse cx="44" cy="34" rx="12" ry="6" fill="#fff" opacity=".12" transform="rotate(-32 44 34)" />
        )}

        {/* The face: smoked glass, the eyes behind it as LEDs. */}
        <g transform={md ? undefined : "translate(60 58) scale(1.3) translate(-60 -58)"}>
          <rect x="41" y="47" width="38" height="20" rx="10" fill="#060708" />
          <g clipPath={u("visor")}>
            <g ref={eyes} className="gb-eyes">
              {md && (
                <g className="gb-bloom" filter={u("bloom")} opacity=".7">
                  <rect x="48" y="52" width="8" height="10" rx="4" fill="#ff5b1f" />
                  <rect x="64" y="52" width="8" height="10" rx="4" fill="#ff5b1f" />
                </g>
              )}
              <rect className="gb-eye" x="49" y="52.5" width="6" height="9" rx="3" fill="#ff7a45" />
              <rect className="gb-eye" x="65" y="52.5" width="6" height="9" rx="3" fill="#ff7a45" />
            </g>
            <rect className="gb-scan" x="38" y="47" width="10" height="20" fill="#ff5b1f" opacity=".28" />
            <g className="gb-bars" fill="#ff7a45">
              <rect x="47" y="51" width="4" height="12" rx="2" />
              <rect x="54" y="51" width="4" height="12" rx="2" />
              <rect x="61" y="51" width="4" height="12" rx="2" />
              <rect x="68" y="51" width="4" height="12" rx="2" />
            </g>
            <path d="M41 47 H66 L56 67 H41 Z" fill={u("glare")} />
          </g>
          <rect x="41" y="47" width="38" height="20" rx="10" fill="none" stroke={u("glassEdge")} strokeWidth=".9" />
        </g>

        {/* The status light, set into the shell. */}
        <circle cx={md ? 80.5 : 88} cy={md ? 37 : 28} r={md ? 3.4 : 7.5} fill="#08090b" />
        <circle className="gb-status" cx={md ? 80.5 : 88} cy={md ? 37 : 28} r={md ? 2.1 : 5} fill={status} />
        {md && <circle cx="79.8" cy="36.3" r=".6" fill="#fff" opacity=".7" />}

        {/* The ring's near half crosses in front, with a glint that travels round it while the guide thinks. */}
        {md && (
          <g transform="rotate(-14 60 60)" clipPath={u("front")}>
            <ellipse cx="60" cy="60" rx="48" ry="12" fill="none" stroke={u("metal")} strokeWidth="2.4" />
            <ellipse cx="60" cy="60.9" rx="48" ry="12" fill="none" stroke="#000" strokeOpacity=".35" strokeWidth=".7" />
            <ellipse className="gb-glint" cx="60" cy="60" rx="48" ry="12" fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="9 300" opacity="0" />
          </g>
        )}

        {md && (
          <text className="gb-zz" x="88" y="26" fontFamily="var(--font-mono, monospace)" fontSize="10" fill="#a3a9b1">
            z
          </text>
        )}
      </g>
    </svg>
  );
}
