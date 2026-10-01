"use client"

// Magic UI TypingAnimation (shadcn registry), adapted for this platform:
// - Types once, when it scrolls into view — no looping, no deleting.
// - The full text is always in the page (for screen readers, crawlers and
//   no-JS visitors) and reserves its space, so nothing below jumps while it
//   types; under prefers-reduced-motion it simply shows the text.
// - The cursor is an ember caret that goes away when typing finishes.

import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

interface TypingAnimationProps {
  children: string
  className?: string
  /** Milliseconds per character. */
  speed?: number
  delay?: number
}

export function TypingAnimation({ children, className, speed = 22, delay = 250 }: TypingAnimationProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduced = useReducedMotion()
  const [count, setCount] = useState(0)
  // The server can't know the visitor's motion setting, so the first render
  // matches the server's (typing not started); reduced motion applies right
  // after hydration. Deciding it during the first render broke hydration.
  const [hydrated, setHydrated] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- marks hydration done, once
  useEffect(() => setHydrated(true), [])
  const done = (hydrated && reduced === true) || count >= children.length

  useEffect(() => {
    if (!inView || reduced) return
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const step = () => {
      i += 1
      setCount(i)
      if (i < children.length) timer = setTimeout(step, speed)
    }
    timer = setTimeout(step, delay)
    return () => clearTimeout(timer)
  }, [inView, reduced, children, speed, delay])

  return (
    <span ref={ref} className={cn("relative inline-grid", className)}>
      <span className="sr-only">{children}</span>
      {/* The full text, invisible, holds the size; the typed text sits on top of it. */}
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {children}
      </span>
      <span aria-hidden="true" className="col-start-1 row-start-1">
        {done ? children : children.slice(0, count)}
        {!done && <span className="ml-px inline-block h-[1.05em] w-[2px] translate-y-[0.15em] animate-pulse bg-ember" />}
      </span>
    </span>
  )
}
