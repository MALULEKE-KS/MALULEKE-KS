"use client"

// Magic UI AnimatedList (shadcn registry), adapted for this platform: items
// arrive one after another, newest on top, like a live feed — starting when
// the list scrolls into view, once. It settles with every item shown (no
// loop). Under prefers-reduced-motion, and before it's in view on the server,
// every item is simply there.

import { Children, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

export function AnimatedList({ children, className, delay = 650 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const reduced = useReducedMotion()
  // Items come newest-first; the feed reveals the oldest first, so the newest lands on top last.
  const items = useMemo(() => Children.toArray(children), [children])
  const [shown, setShown] = useState<number | null>(null)

  useEffect(() => {
    if (!inView || reduced) return
    let n = 0
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starting the feed when it comes into view
    setShown(0)
    const timer = setInterval(() => {
      n += 1
      setShown(n)
      if (n >= items.length) clearInterval(timer)
    }, delay)
    return () => clearInterval(timer)
  }, [inView, reduced, items.length, delay])

  const visible = shown === null || reduced ? items : items.slice(items.length - shown)

  return (
    <div ref={ref} className={cn("flex flex-col gap-2", className)}>
      <AnimatePresence initial={false}>
        {visible.map((item) => (
          <motion.div
            key={(item as React.ReactElement).key}
            layout
            initial={{ scale: 0.9, opacity: 0, y: -6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 36 }}
          >
            {item}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
