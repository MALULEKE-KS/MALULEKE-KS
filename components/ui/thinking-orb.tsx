"use client"

// The dotted orb from 21st.dev's "AI thinking orb and input" (MorphOrb),
// adapted for this platform:
// - Only the orb: a rotating sphere of dots drawn on a canvas, with its light
//   programs. The component's pill-to-card morph, rotating labels and answer
//   card are left out — the guide streams long answers in its own panel.
// - Honest: the light program follows what the guide is really doing (the
//   `mode` prop, from the chat's live state), never a timer cycling labels.
// - Tokens, not raw colours: the resting dot colour is the element's border
//   colour and the lit colour is its text colour, read from computed style, so
//   the classes below decide them (bone at rest, International Orange lit).
// - Reduced motion: one still frame, fully formed. Decorative: aria-hidden —
//   the caller says the state in text.

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

export type OrbMode = "think" | "search" | "navigate" | "compose"

const PROGRAM: Record<OrbMode, number> = { think: 0, search: 1, navigate: 2, compose: 3 }
const TAU = Math.PI * 2
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Points on a sphere in latitude rings; fewer for a small orb so it never clogs. */
function sphere(rings: number, perRing: number) {
  const rand = mulberry32(7)
  const dots: { x: number; y: number; z: number; u: number; seed: number }[] = []
  for (let k = 0; k < rings; k++) {
    const y = 1 - ((k + 0.5) / rings) * 2
    const r = Math.sqrt(1 - y * y)
    const m = Math.max(4, Math.round(perRing * r))
    for (let j = 0; j < m; j++) {
      const a = (j / m) * TAU + k * 0.35
      dots.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, u: (1 - y) / 2, seed: rand() * TAU })
    }
  }
  return dots
}

function rgb(css: string): [number, number, number] | null {
  const m = css.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

interface ThinkingOrbProps {
  /** What the guide is doing right now — picks the light program. */
  mode?: OrbMode
  /** Rendered size in CSS pixels. */
  size?: number
  className?: string
}

export function ThinkingOrb({ mode = "think", size = 56, className }: ThinkingOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef(PROGRAM[mode])

  useEffect(() => {
    modeRef.current = PROGRAM[mode]
  }, [mode])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const style = getComputedStyle(canvas)
    const rest = rgb(style.borderTopColor) ?? [244, 242, 238]
    const lit = rgb(style.color) ?? [255, 91, 31]
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const small = size < 96
    const dots = sphere(small ? 11 : 16, small ? 20 : 30)
    const N = dots.length
    // 30% of the box, as the original (66 / 220): perspective swells the near
    // side by up to ~1.56×, which then still fits.
    const R = size * 0.3
    const dotScale = Math.max(0.6, R / 66)
    const C0 = size / 2

    // Colour palette: rest → lit by light level, by alpha. Built once.
    const C_STEPS = 12
    const A_STEPS = 32
    const palette: string[] = []
    for (let ci = 0; ci <= C_STEPS; ci++) {
      const t = ci / C_STEPS
      const r = Math.round(rest[0] + (lit[0] - rest[0]) * t)
      const g = Math.round(rest[1] + (lit[1] - rest[1]) * t)
      const b = Math.round(rest[2] + (lit[2] - rest[2]) * t)
      for (let ai = 0; ai <= A_STEPS; ai++) palette.push(`rgba(${r},${g},${b},${(ai / A_STEPS).toFixed(3)})`)
    }

    const light = new Float32Array(N)
    const weights = [1, 0, 0, 0]
    const SX = new Float32Array(N)
    const SY = new Float32Array(N)
    const SR = new Float32Array(N)
    const SD = new Float32Array(N)
    const SC = new Int16Array(N)
    const CP = Math.cos(0.35)
    const SP = Math.sin(0.35)
    let time = reduced ? 1.2 : 0
    let rot = 0
    let formed = reduced ? 1 : 0
    let raf = 0
    let last = performance.now()

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, size, size)
      time += dt
      rot += 0.9 * dt
      formed = Math.min(1, formed + dt / 0.7)
      const cy = Math.cos(rot)
      const sy = Math.sin(rot)

      // Cross-fade between light programs when the mode changes.
      const step = reduced ? 1 : dt / 0.35
      for (let q = 0; q < 4; q++) {
        const d = (q === modeRef.current ? 1 : 0) - weights[q]!
        weights[q]! += Math.abs(d) <= step ? d : d > 0 ? step : -step
      }
      const decay = Math.exp(-dt / 0.5)
      const h0 = (time * N * 0.9) % N
      const h3 = (time * N * 1.45) % N
      const a1 = time * 0.8
      const b1 = Math.sin(time * 0.5) * 0.9
      const f1 = [Math.cos(b1) * Math.cos(a1), Math.sin(b1), Math.cos(b1) * Math.sin(a1)]
      const a2 = time * 0.55 + 2.1
      const b2 = Math.cos(time * 0.42) * 0.9
      const f2 = [Math.cos(b2) * Math.cos(a2), Math.sin(b2), Math.cos(b2) * Math.sin(a2)]
      const lat = Math.sin(time * 2.2)
      const chase = small ? 10 : 16

      for (let n = 0; n < N; n++) {
        const { x: dx, y: dy, z: dz, u, seed } = dots[n]!

        let pulse = 0
        // 0 — think: a comet chasing round the rings.
        if (weights[0]! > 0.001) {
          let dd = Math.abs(n - h0)
          if (dd > N - dd) dd = N - dd
          const v = Math.max(0, 1 - dd / chase)
          pulse = Math.max(pulse, v * v * weights[0]!)
        }
        // 1 — search: two spotlights roaming the surface.
        if (weights[1]! > 0.001) {
          const v1 = Math.max(0, (dx * f1[0]! + dy * f1[1]! + dz * f1[2]! - 0.72) / 0.28)
          const v2 = Math.max(0, (dx * f2[0]! + dy * f2[1]! + dz * f2[2]! - 0.72) / 0.28)
          const v = Math.max(v1, v2)
          pulse = Math.max(pulse, v * v * weights[1]!)
        }
        // 2 — navigate: a scan line sweeping pole to pole.
        if (weights[2]! > 0.001) {
          const e = dy - lat
          const v = Math.max(0, 1 - (e * e) / 0.02)
          pulse = Math.max(pulse, v * v * weights[2]!)
        }
        // 3 — compose: a faster, longer comet.
        if (weights[3]! > 0.001) {
          let dd = Math.abs(n - h3)
          if (dd > N - dd) dd = N - dd
          const v = Math.max(0, 1 - dd / (chase * 1.4))
          pulse = Math.max(pulse, v * v * weights[3]!)
        }
        const l = Math.max(light[n]! * decay, pulse)
        light[n] = l

        // Forms top to bottom on first paint.
        const ki = clamp01(formed * 1.6 - 0.6 * u)
        if (ki <= 0.001) {
          SC[n] = -1
          continue
        }
        const k = easeOut(ki)

        const x1 = dx * cy + dz * sy
        const z1 = -dx * sy + dz * cy
        const y2 = dy * CP - z1 * SP
        const z2 = dy * SP + z1 * CP
        const f = 2.8 / (2.8 - z2)
        const depth = (z2 + 1) / 2

        let a = 0.1 + 0.035 * Math.sin(seed + time * 1.6) + 0.32 * depth * depth + 0.75 * l
        a = Math.min(1, a) * k

        SX[n] = C0 + x1 * R * k * f
        SY[n] = C0 - y2 * R * k * f
        SD[n] = depth
        SR[n] = (1.15 * (0.45 + 0.75 * depth) * f + 0.9 * l) * dotScale * (0.4 + 0.6 * k)
        const ai = Math.round(a * A_STEPS)
        SC[n] = ai <= 0 ? -1 : Math.round(clamp01(l * 1.4) * C_STEPS) * (A_STEPS + 1) + ai
      }

      // Back half first, then the front, so near dots sit on top.
      for (let pass = 0; pass < 2; pass++) {
        for (let n = 0; n < N; n++) {
          const c = SC[n]!
          if (c < 0 || SD[n]! >= 0.5 !== (pass === 1)) continue
          ctx.fillStyle = palette[c]!
          ctx.beginPath()
          ctx.arc(SX[n]!, SY[n]!, SR[n]!, 0, TAU)
          ctx.fill()
        }
      }
    }

    if (reduced) {
      draw(0)
      return
    }
    const frame = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000))
      last = now
      draw(dt)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [size])

  return <canvas ref={canvasRef} aria-hidden="true" style={{ width: size, height: size }} className={cn("text-ember border-paper block shrink-0 border-0", className)} />
}
