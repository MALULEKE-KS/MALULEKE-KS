"use client"

// Magic UI FlickeringGrid (shadcn registry), adapted for this platform:
// - Colour is a CSS colour the caller passes from the tokens (default: the
//   ember accent), resolved once on the client — never a baked-in hex.
// - Draws only while on screen, at ~20 frames a second (a flicker doesn't
//   need 60); under prefers-reduced-motion it draws one still frame.
// - Decorative: aria-hidden, pointer-events none.

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

interface FlickeringGridProps {
  squareSize?: number
  gridGap?: number
  flickerChance?: number
  color?: string
  maxOpacity?: number
  className?: string
}

function toRgbPrefix(color: string) {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext("2d")
  if (!ctx) return "rgba(255, 91, 31,"
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data)
  return `rgba(${r}, ${g}, ${b},`
}

export function FlickeringGrid({
  squareSize = 3,
  gridGap = 6,
  flickerChance = 0.25,
  color = "var(--color-ember)",
  maxOpacity = 0.25,
  className,
}: FlickeringGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!container || !canvas || !ctx) return

    // var(--token) resolves through the element's computed style.
    const resolved = color.startsWith("var(")
      ? getComputedStyle(container).getPropertyValue(color.slice(4, -1)).trim() || "#ff5b1f"
      : color
    const rgb = toRgbPrefix(resolved)
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let cols = 0
    let rows = 0
    let dpr = 1
    let squares = new Float32Array(0)
    let frame: number | null = null
    let visible = false
    let last = 0

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          ctx.fillStyle = `${rgb}${squares[i * rows + j]})`
          ctx.fillRect(i * (squareSize + gridGap) * dpr, j * (squareSize + gridGap) * dpr, squareSize * dpr, squareSize * dpr)
        }
      }
    }

    const setup = () => {
      const { clientWidth: w, clientHeight: h } = container
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      cols = Math.ceil(w / (squareSize + gridGap))
      rows = Math.ceil(h / (squareSize + gridGap))
      squares = new Float32Array(cols * rows).map(() => Math.random() * maxOpacity)
      draw()
    }

    const tick = (time: number) => {
      if (last && time - last < 50) {
        frame = visible ? requestAnimationFrame(tick) : null
        return
      }
      const dt = last ? (time - last) / 1000 : 0
      last = time
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < flickerChance * dt) squares[i] = Math.random() * maxOpacity
      }
      draw()
      frame = visible ? requestAnimationFrame(tick) : null
    }

    setup()
    const ro = new ResizeObserver(setup)
    ro.observe(container)
    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting
      if (visible && !still && frame === null) {
        last = 0
        frame = requestAnimationFrame(tick)
      }
    })
    io.observe(canvas)

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      ro.disconnect()
      io.disconnect()
    }
  }, [squareSize, gridGap, flickerChance, color, maxOpacity])

  return (
    <div ref={containerRef} aria-hidden="true" className={cn("pointer-events-none size-full", className)}>
      <canvas ref={canvasRef} />
    </div>
  )
}
