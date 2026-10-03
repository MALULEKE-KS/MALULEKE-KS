"use client"

// 21st.dev "Coverflow Carousel", adapted for this platform:
// - Slides are content, not just an <img>: the caller renders each one
//   (`renderSlide`), so a system without a screenshot is a designed card from
//   its own data, never a stock picture.
// - Any card shape (`aspect`, width / height), not only squares.
// - The first frame is CSS (calc on the card-width variable), so the server's
//   HTML is already the fanned-out ring — no pile of cards before hydration,
//   and the same markup on both sides. After that, frames paint straight to
//   the DOM, as the original does.
// - A side card brings itself to the centre when clicked; the centre one is
//   the caller's to act on (`onActivate` — open its page). A drag is never a
//   click. Enter on the focused carousel activates the centre card.
// - Reduced motion: moves land at once.
// - Tokens: ink/paper/ember, no shadcn `foreground`/`muted` defaults; the
//   arrows and dots are this site's controls.

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

export interface CoverflowCarouselProps<T> {
  slides: T[]
  renderSlide: (slide: T, state: { index: number; active: boolean }) => React.ReactNode
  /** Names each slide for assistive tech. */
  slideLabel: (slide: T) => string
  /** The centre card was chosen (clicked, or Enter). */
  onActivate?: (slide: T, index: number) => void
  onSelect?: (index: number) => void
  /** Width / height of a card. */
  aspect?: number
  rotate?: number
  depth?: number
  perspective?: number
  falloff?: number
  fade?: number
  /** Any CSS length; everything else is derived from it. */
  cardWidth?: string
  gap?: number
  loop?: boolean
  label?: string
  className?: string
  cardClassName?: string
}

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

export function CoverflowCarousel<T>({
  slides,
  renderSlide,
  slideLabel,
  onActivate,
  onSelect,
  aspect = 1,
  rotate = 44,
  depth = 0.6,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = "clamp(148px, 22vw, 260px)",
  gap = 0.05,
  loop = true,
  label = "Carousel",
  className,
  cardClassName,
}: CoverflowCarouselProps<T>) {
  const count = slides.length
  const frameRef = React.useRef<HTMLDivElement>(null)
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const posRef = React.useRef(0)
  const targetRef = React.useRef(0)
  const widthRef = React.useRef(0)
  const rafRef = React.useRef<number | null>(null)
  const reducedRef = React.useRef(false)
  const dragRef = React.useRef<{ id: number; x: number; pos: number; v: number; t: number; moved: boolean } | null>(null)
  /** Set by a drag that moved, so the click that ends it is ignored. */
  const draggedRef = React.useRef(false)
  const [selected, setSelected] = React.useState(0)

  const indexAt = React.useCallback((pos: number) => ((Math.round(pos) % count) + count) % count, [count])

  /** Where card `index` sits for a ring centred on `pos`. */
  const place = React.useCallback(
    (index: number, pos: number) => {
      let offset = index - pos
      if (loop) {
        offset = ((offset % count) + count) % count
        if (offset > count / 2) offset -= count
      }
      const distance = Math.abs(offset)
      const ramp = Math.pow(distance, falloff)
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset)
      const edge = loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1
      return { offset, ramp, tilt, opacity: Math.max(0, 1 - fade * distance) * edge, z: 100 - Math.round(distance) }
    },
    [count, falloff, fade, loop, rotate],
  )

  const paint = React.useCallback(() => {
    const width = widthRef.current
    if (!width) return
    const pitch = width * (1 + gap)
    cardRefs.current.forEach((card, index) => {
      if (!card) return
      const p = place(index, posRef.current)
      card.style.transform = `translateX(calc(-50% + ${p.offset * pitch}px)) translateZ(${-depth * width * p.ramp}px) rotateY(${-p.tilt}deg)`
      card.style.opacity = String(p.opacity)
      card.style.zIndex = String(p.z)
    })
  }, [depth, gap, place])

  const select = React.useCallback(
    (index: number) => {
      setSelected(index)
      onSelect?.(index)
    },
    [onSelect],
  )

  const settle = React.useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      targetRef.current = target
      select(indexAt(target))
      if (reducedRef.current) {
        posRef.current = target
        paint()
        rafRef.current = null
        return
      }
      const step = () => {
        const remaining = target - posRef.current
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target
          paint()
          rafRef.current = null
          return
        }
        posRef.current += remaining * 0.16
        paint()
        rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    },
    [indexAt, paint, select],
  )

  const clamp = React.useCallback((pos: number) => (loop ? pos : Math.max(0, Math.min(count - 1, pos))), [count, loop])

  const goTo = React.useCallback(
    (index: number) => {
      const target = loop ? index + Math.round((targetRef.current - index) / count) * count : index
      settle(clamp(target))
    },
    [clamp, count, loop, settle],
  )

  const nudge = React.useCallback((by: number) => settle(clamp(Math.round(targetRef.current) + by)), [clamp, settle])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    draggedRef.current = false
    targetRef.current = posRef.current
    dragRef.current = { id: event.pointerId, x: event.clientX, pos: posRef.current, v: 0, t: performance.now(), moved: false }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    const pitch = widthRef.current * (1 + gap)
    if (!pitch) return
    if (!drag.moved) {
      // A few pixels is still a click.
      if (Math.abs(event.clientX - drag.x) < 6) return
      drag.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const now = performance.now()
    const previous = posRef.current
    posRef.current = clamp(drag.pos - (event.clientX - drag.x) / pitch)
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000
    drag.t = now
    const index = indexAt(posRef.current)
    if (index !== selected) select(index)
    paint()
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    dragRef.current = null
    if (!drag.moved) {
      settle(targetRef.current)
      return
    }
    draggedRef.current = true
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18))
    settle(clamp(Math.round(posRef.current + carried)))
  }

  useIsoLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    reducedRef.current = mq.matches
    const onMq = (e: MediaQueryListEvent) => {
      reducedRef.current = e.matches
    }
    mq.addEventListener("change", onMq)
    const measure = () => {
      const card = cardRefs.current[0]
      if (!card) return
      widthRef.current = card.offsetWidth
      paint()
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => {
      observer.disconnect()
      mq.removeEventListener("change", onMq)
    }
  }, [paint])

  React.useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  if (count === 0) return null

  return (
    <div className={cn("w-full", className)} style={{ ["--cf-card" as string]: cardWidth }} role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="relative">
        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault()
              nudge(-1)
            } else if (event.key === "ArrowRight") {
              event.preventDefault()
              nudge(1)
            } else if (event.key === "Enter" && onActivate) {
              event.preventDefault()
              onActivate(slides[selected]!, selected)
            }
          }}
          aria-describedby={undefined}
          className="focus-visible:outline-ember cursor-grab overflow-hidden rounded-3xl py-10 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 active:cursor-grabbing"
          style={{ perspective: `calc(var(--cf-card) * ${perspective})`, touchAction: "pan-y" }}
        >
          <div className="relative select-none" style={{ height: `calc(var(--cf-card) / ${aspect})`, transformStyle: "preserve-3d" }}>
            {slides.map((slide, index) => {
              // The first frame, in CSS: the server draws the ring already fanned out.
              const p = place(index, 0)
              const active = index === selected
              return (
                <div
                  key={index}
                  ref={(node) => {
                    cardRefs.current[index] = node
                  }}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${slideLabel(slide)} — ${index + 1} of ${count}`}
                  aria-current={active ? "true" : undefined}
                  onClick={() => {
                    if (draggedRef.current) {
                      draggedRef.current = false
                      return
                    }
                    if (active) onActivate?.(slide, index)
                    else goTo(index)
                  }}
                  className={cn("absolute top-0 left-1/2 cursor-pointer overflow-hidden rounded-2xl shadow-[0_30px_60px_-25px_rgb(0_0_0/0.7)] will-change-transform", cardClassName)}
                  style={{
                    width: "var(--cf-card)",
                    height: `calc(var(--cf-card) / ${aspect})`,
                    transform: `translateX(calc(-50% + ${p.offset} * var(--cf-card) * ${1 + gap})) translateZ(calc(${-depth * p.ramp} * var(--cf-card))) rotateY(${-p.tilt}deg)`,
                    opacity: p.opacity,
                    zIndex: p.z,
                  }}
                >
                  {renderSlide(slide, { index, active })}
                </div>
              )
            })}
          </div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => nudge(-1)}
              className="bg-night/70 text-paper hover:bg-night focus-visible:outline-ember absolute top-1/2 left-2 z-[200] grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 backdrop-blur transition focus-visible:outline-2 sm:left-4"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => nudge(1)}
              className="bg-night/70 text-paper hover:bg-night focus-visible:outline-ember absolute top-1/2 right-2 z-[200] grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 backdrop-blur transition focus-visible:outline-2 sm:right-4"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {slides.map((slide, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Show ${slideLabel(slide)}`}
              aria-current={index === selected ? "true" : undefined}
              onClick={() => goTo(index)}
              className="focus-visible:outline-ember grid size-6 place-items-center rounded-full focus-visible:outline-2"
            >
              <span className={cn("block h-1.5 rounded-full transition-all duration-300", index === selected ? "bg-ember w-5" : "w-1.5 bg-white/30")} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
