"use client"

// 21st.dev "Project Showcase" (jatin-yadav05) — copied via the site's
// Copy prompt → Claude Code (2026-09-30), adapted for this platform:
// - Data comes in as props (published systems), not a hardcoded list.
// - Performance: the original set React state on every animation frame,
//   forever; here the preview follows the pointer through a ref-driven
//   transform, and the frame loop only runs while the preview is showing.
// - Position: the original used position:fixed from a rect read at render
//   (it drifted on scroll); the preview is placed inside the list instead.
// - Tokens: ink/slate on paper, the ember accent; a system without a
//   screenshot gets an honest branded tile, never a stock image.
// - No preview on touch devices or under prefers-reduced-motion; keyboard
//   focus gets the same highlight as hover.

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ShowcaseItem {
  key: string
  title: string
  description: string
  href: string
  /** A screenshot URL, or null for the branded tile. */
  image: string | null
  /** Small line under the description, e.g. "KSDRILL-SA / Fintech · last push 2 days ago". */
  meta?: string
  /** Right-hand slot, e.g. a status badge. */
  aside?: React.ReactNode
}

export function ProjectShowcase({ items, className }: { items: ShowcaseItem[]; className?: string }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [canPreview, setCanPreview] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const target = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)")
    const still = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setCanPreview(fine.matches && !still.matches)
    update()
    fine.addEventListener("change", update)
    still.addEventListener("change", update)
    return () => {
      fine.removeEventListener("change", update)
      still.removeEventListener("change", update)
    }
  }, [])

  // Ease the preview toward the pointer while it's showing; stop when it isn't.
  useEffect(() => {
    if (hovered === null || !canPreview) return
    let frame = 0
    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.18
      current.current.y += (target.current.y - current.current.y) * 0.18
      if (previewRef.current) previewRef.current.style.transform = `translate3d(${current.current.x + 24}px, ${current.current.y - 110}px, 0)`
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [hovered, canPreview])

  const onMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    target.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const enter = (i: number, e?: React.MouseEvent) => {
    if (e) {
      onMove(e)
      if (hovered === null) current.current = { ...target.current }
    }
    setHovered(i)
  }

  return (
    <div ref={containerRef} onMouseMove={onMove} className={cn("relative", className)}>
      {canPreview && (
        <div
          ref={previewRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-30 overflow-hidden rounded-xl shadow-[0_24px_60px_-18px_rgb(0_0_0/0.45)] ring-1 ring-ink/10 transition-[opacity,scale] duration-300 ease-out"
          style={{ opacity: hovered === null ? 0 : 1, scale: hovered === null ? "0.85" : "1" }}
        >
          <div className="bg-night relative h-[180px] w-[288px] overflow-hidden rounded-xl">
            {items.map((item, i) =>
              item.image ? (
                // Plain <img>: screenshots are admin-supplied URLs with no fixed host.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={item.key}
                  src={item.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-top transition-all duration-500 ease-out"
                  style={{ opacity: hovered === i ? 1 : 0, scale: hovered === i ? "1" : "1.08", filter: hovered === i ? "none" : "blur(8px)" }}
                />
              ) : (
                <div
                  key={item.key}
                  className="hero-field absolute inset-0 grid place-items-center transition-all duration-500 ease-out"
                  style={{ opacity: hovered === i ? 1 : 0, scale: hovered === i ? "1" : "1.08" }}
                >
                  <span className="text-paper px-6 text-center font-mono text-sm tracking-tight">{item.title}</span>
                </div>
              ),
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-night/30 to-transparent" />
          </div>
        </div>
      )}

      <ul>
        {items.map((item, i) => {
          const on = hovered === i
          return (
            <li key={item.key} className="border-ink/10 border-t last:border-b">
              <Link
                href={item.href}
                className="group relative block py-5 focus-visible:outline-none"
                onMouseEnter={(e) => enter(i, e)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => enter(i)}
                onBlur={() => setHovered(null)}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 -mx-4 rounded-xl bg-ink/[0.035] transition-all duration-300 ease-out group-focus-visible:ring-2 group-focus-visible:ring-ember",
                    on ? "scale-100 opacity-100" : "scale-[0.97] opacity-0",
                  )}
                />
                <span className="relative flex items-start justify-between gap-4">
                  <span className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-ink relative text-lg font-medium tracking-tight">
                        {item.title}
                        <span aria-hidden="true" className={cn("bg-ember absolute -bottom-0.5 left-0 h-px transition-all duration-300 ease-out", on ? "w-full" : "w-0")} />
                      </span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className={cn("text-accent size-4 transition-all duration-300 ease-out", on ? "translate-x-0 translate-y-0 opacity-100" : "-translate-x-2 translate-y-2 opacity-0")}
                      />
                    </span>
                    <span className={cn("mt-1 block text-sm leading-relaxed transition-colors duration-300", on ? "text-ink/75" : "text-slate")}>{item.description}</span>
                    {item.meta && <span className="text-slate/80 mt-1.5 block font-mono text-[11px]">{item.meta}</span>}
                  </span>
                  {item.aside && <span className="shrink-0">{item.aside}</span>}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
