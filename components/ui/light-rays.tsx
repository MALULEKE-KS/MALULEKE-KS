"use client"

// Magic UI Light Rays (registry "light-rays"), adapted for this platform:
// - Ember by default (DESIGN-SYSTEM §1), screen-blended over graphite.
// - Rays are placed deterministically (no Math.random at render), so server
//   and browser agree and nothing jumps on hydration.
// - Reduced motion: the soft glow stays, the rays are hidden by CSS — the
//   same markup on server and client, so hydration always matches.

import type { CSSProperties } from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

interface LightRaysProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number
  color?: string
  blur?: number
  /** One cycle, in seconds. */
  speed?: number
  length?: string
}

/** A stable pseudo-random sequence, so every render places the same rays. */
function seeded(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function LightRays({ className, style, count = 6, color = "rgb(255 91 31 / 0.22)", blur = 36, speed = 14, length = "70vh", ...props }: LightRaysProps) {
  const rays = Array.from({ length: count }, (_, i) => ({
    left: 8 + seeded(i, 1) * 84,
    rotate: -28 + seeded(i, 2) * 56,
    width: 160 + seeded(i, 3) * 160,
    swing: 0.8 + seeded(i, 4) * 1.8,
    delay: seeded(i, 5) * speed,
    duration: speed * (0.75 + seeded(i, 6) * 0.5),
    intensity: 0.6 + seeded(i, 7) * 0.5,
  }))
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 isolate overflow-hidden rounded-[inherit]", className)}
      style={{ "--light-rays-color": color, "--light-rays-blur": `${blur}px`, "--light-rays-length": length, ...style } as CSSProperties}
      {...props}
    >
      <div className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 20% 15%, color-mix(in srgb, var(--light-rays-color) 45%, transparent), transparent 70%)" }} />
      <div className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 80% 10%, color-mix(in srgb, var(--light-rays-color) 35%, transparent), transparent 75%)" }} />
      {rays.map((r, i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute -top-[12%] h-[var(--light-rays-length)] origin-top -translate-x-1/2 rounded-full opacity-0 mix-blend-screen blur-[var(--light-rays-blur)] motion-reduce:hidden"
            style={{ left: `${r.left}%`, width: r.width, backgroundImage: "linear-gradient(to bottom, color-mix(in srgb, var(--light-rays-color) 70%, transparent), transparent)" }}
            initial={{ rotate: r.rotate }}
            animate={{ opacity: [0, r.intensity, 0], rotate: [r.rotate - r.swing, r.rotate + r.swing, r.rotate - r.swing] }}
            transition={{ duration: r.duration, repeat: Infinity, ease: "easeInOut", delay: r.delay, repeatDelay: r.duration * 0.1 }}
          />
        ))}
    </div>
  )
}
