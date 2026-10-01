"use client"

// Magic UI BlurFade (shadcn registry), adapted for this platform: content
// fades up out of a soft blur when it scrolls into view, once. `delay`
// staggers a list. Under prefers-reduced-motion it simply appears — with the
// same markup as the server renders (an instant transition, not a different
// element), so hydration never mismatches.

import { motion, useReducedMotion } from "motion/react"

export function BlurFade({ children, className, delay = 0, y = 8 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.4 }}
      transition={reduced ? { duration: 0 } : { duration: 0.45, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}
