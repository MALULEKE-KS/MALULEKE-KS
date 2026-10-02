"use client"

// Magic UI MagicCard (shadcn registry), adapted for this platform:
// - Colours are our tokens: the border lights up in International Orange →
//   gold where the pointer is, over a graphite surface (DESIGN-SYSTEM §1).
// - No theme library: the site's dark surfaces are explicit, not a theme switch.
// - Gradient mode only; the spotlight fades out when the pointer leaves, and
//   never runs under prefers-reduced-motion (the border stays a quiet line).

import { useCallback, useEffect } from "react"
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

interface MagicCardProps {
  children?: React.ReactNode
  className?: string
  /** The surface inside the border. */
  surface?: string
  gradientSize?: number
  gradientFrom?: string
  gradientTo?: string
  /** The soft light inside the card under the pointer. */
  spotlight?: string
  /** The border away from the pointer — a light hairline on dark, a dark one on bone. */
  rest?: string
}

export function MagicCard({
  children,
  className,
  surface = "var(--color-night)",
  gradientSize = 260,
  gradientFrom = "var(--color-ember)",
  gradientTo = "#ffb547",
  spotlight = "rgb(255 91 31 / 0.07)",
  rest = "rgb(255 255 255 / 0.1)",
}: MagicCardProps) {
  const reduced = useReducedMotion()
  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)

  const reset = useCallback(() => {
    mouseX.set(-gradientSize)
    mouseY.set(-gradientSize)
  }, [mouseX, mouseY, gradientSize])

  useEffect(() => {
    const out = (e: PointerEvent) => !e.relatedTarget && reset()
    window.addEventListener("pointerout", out)
    window.addEventListener("blur", reset)
    return () => {
      window.removeEventListener("pointerout", out)
      window.removeEventListener("blur", reset)
    }
  }, [reset])

  const border = useMotionTemplate`
    linear-gradient(${surface} 0 0) padding-box,
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientFrom}, ${gradientTo}, ${rest} 100%) border-box`
  const glow = useMotionTemplate`radial-gradient(${gradientSize * 1.6}px circle at ${mouseX}px ${mouseY}px, ${spotlight}, transparent 100%)`

  return (
    <motion.div
      className={cn("group relative isolate overflow-hidden border border-transparent", className)}
      onPointerMove={(e) => {
        if (reduced) return
        const r = e.currentTarget.getBoundingClientRect()
        mouseX.set(e.clientX - r.left)
        mouseY.set(e.clientY - r.top)
      }}
      onPointerLeave={reset}
      style={{ background: border }}
    >
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: glow }} />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
