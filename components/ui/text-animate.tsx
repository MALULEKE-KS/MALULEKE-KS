"use client"

// Magic UI Text Animate (registry "text-animate"), adapted for this platform:
// - Reduced motion: an instant transition — the same markup as the server
//   renders, so hydration never mismatches (BlurFade's pattern).
// - The server-rendered text is the real text (screen readers get it once,
//   via the container's aria-label; the animated segments are hidden).
// - Only the presets this site uses are kept (fadeIn, blurIn, blurInUp,
//   slideUp) — fewer variants, smaller bundle.

import { memo } from "react"
import { motion, useReducedMotion, type Variants } from "motion/react"

import { cn } from "@/lib/utils"

type By = "word" | "character" | "text"
type Animation = "fadeIn" | "blurIn" | "blurInUp" | "slideUp"

const motionElements = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  span: motion.span,
  div: motion.div,
} as const

interface TextAnimateProps {
  children: string
  className?: string
  segmentClassName?: string
  delay?: number
  duration?: number
  as?: keyof typeof motionElements
  by?: By
  animation?: Animation
  once?: boolean
}

const ITEMS: Record<Animation, Variants> = {
  fadeIn: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
  blurIn: { hidden: { opacity: 0, filter: "blur(10px)" }, show: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.4 } } },
  blurInUp: {
    hidden: { opacity: 0, filter: "blur(10px)", y: 16 },
    show: { opacity: 1, filter: "blur(0px)", y: 0, transition: { y: { duration: 0.35 }, opacity: { duration: 0.45 }, filter: { duration: 0.35 } } },
  },
  slideUp: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
}

function TextAnimateBase({ children, className, segmentClassName, delay = 0, duration = 0.6, as = "p", by = "word", animation = "blurInUp", once = true }: TextAnimateProps) {
  const reduced = useReducedMotion()
  const Component = motionElements[as]
  const segments = by === "word" ? children.split(/(\s+)/) : by === "character" ? children.split("") : [children]
  const container: Variants = {
    hidden: { opacity: 1 },
    show: { opacity: 1, transition: reduced ? { duration: 0 } : { delayChildren: delay, staggerChildren: duration / Math.max(segments.length, 1) } },
  }
  return (
    <Component variants={container} initial="hidden" whileInView="show" viewport={{ once }} className={cn("whitespace-pre-wrap", className)} aria-label={children}>
      {segments.map((segment, i) => (
        <motion.span key={`${by}-${i}`} variants={ITEMS[animation]} transition={reduced ? { duration: 0 } : undefined} aria-hidden="true" className={cn("inline-block whitespace-pre", segmentClassName)}>
          {segment}
        </motion.span>
      ))}
    </Component>
  )
}

export const TextAnimate = memo(TextAnimateBase)
