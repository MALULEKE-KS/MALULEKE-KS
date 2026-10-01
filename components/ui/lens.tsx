"use client"

// Magic UI Lens (shadcn registry), adapted for this platform: a loupe that
// magnifies what's under the pointer — used over system screenshots. Only on
// devices that hover with a fine pointer; never under prefers-reduced-motion
// (then it's just the content). The magnified copy is decorative.

import { useCallback, useState } from "react"
import { AnimatePresence, motion, useMotionTemplate, useReducedMotion } from "motion/react"

interface LensProps {
  children: React.ReactNode
  zoomFactor?: number
  lensSize?: number
  className?: string
}

export function Lens({ children, zoomFactor = 1.6, lensSize = 180, className }: LensProps) {
  const reduced = useReducedMotion()
  const [hovering, setHovering] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])

  const mask = useMotionTemplate`radial-gradient(circle ${lensSize / 2}px at ${pos.x}px ${pos.y}px, #000 100%, transparent 100%)`

  if (reduced) return <div className={className}>{children}</div>

  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      onMouseEnter={(e) => window.matchMedia("(hover: hover) and (pointer: fine)").matches && (onMove(e), setHovering(true))}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={onMove}
    >
      {children}
      <AnimatePresence>
        {hovering && (
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.14 }}
            className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
            style={{ maskImage: mask, WebkitMaskImage: mask, transformOrigin: `${pos.x}px ${pos.y}px` }}
          >
            <div className="absolute inset-0" style={{ transform: `scale(${zoomFactor})`, transformOrigin: `${pos.x}px ${pos.y}px` }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
