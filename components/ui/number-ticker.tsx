"use client"

// Magic UI NumberTicker (shadcn registry), adapted for this platform:
// - The server-rendered text is the REAL value, never the start value — a
//   no-JS visitor or crawler must never read "0 systems shipped" (DESIGN-
//   SYSTEM.md §4.1: every figure is a real fact).
// - Counts up only once it scrolls into view, and never under
//   prefers-reduced-motion (the real value simply stays put).
// - No baked-in text colour; the caller decides.

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react"
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react"

import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  delay?: number
  decimalPlaces?: number
}

export function NumberTicker({
  value,
  startValue = 0,
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reducedMotion = useReducedMotion()
  const motionValue = useMotionValue(startValue)
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })
  const isInView = useInView(ref, { once: true, margin: "0px" })

  const format = (n: number) =>
    Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(n.toFixed(decimalPlaces)))

  useEffect(() => {
    if (!isInView || reducedMotion) return
    // Snap to the start value, then spring up to the real one.
    springValue.jump(startValue)
    const timer = setTimeout(() => motionValue.set(value), delay * 1000)
    return () => clearTimeout(timer)
  }, [isInView, reducedMotion, motionValue, springValue, startValue, value, delay])

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) ref.current.textContent = format(latest)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [springValue, decimalPlaces]
  )

  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)} {...props}>
      {format(value)}
    </span>
  )
}
