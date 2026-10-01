"use client"

// Magic UI Terminal (shadcn registry), adapted for this platform:
// - Lines come in as data: a command is typed out, its results appear one by
//   one after it — once, when the terminal scrolls into view.
// - The full text is always in the page (screen readers, crawlers, no-JS)
//   and reserves the terminal's final height, so nothing jumps while it
//   plays; under prefers-reduced-motion it simply shows everything.
// - Tokens: graphite window, the ember prompt, the finished-signal green for
//   passing checks; traffic lights toned to the palette.

import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

export type TerminalLine =
  | { kind: "command"; text: string }
  | { kind: "ok"; text: string }
  | { kind: "info"; text: string }

const TYPE_MS = 28
const LINE_MS = 260

export function Terminal({ lines, title, className }: { lines: TerminalLine[]; title?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.35 })
  const reduced = useReducedMotion()
  // How far the playback has got: whole lines shown, and characters of the line being typed.
  const [shown, setShown] = useState<{ lines: number; chars: number } | null>(null)

  useEffect(() => {
    if (!inView || reduced) return
    let line = 0
    let chars = 0
    let timer: ReturnType<typeof setTimeout>
    const step = () => {
      const current = lines[line]
      if (!current) return
      if (current.kind === "command" && chars < current.text.length) {
        chars += 1
        setShown({ lines: line, chars })
        timer = setTimeout(step, TYPE_MS)
        return
      }
      line += 1
      chars = 0
      setShown({ lines: line, chars: 0 })
      if (line < lines.length) timer = setTimeout(step, lines[line]?.kind === "command" ? LINE_MS * 2 : LINE_MS)
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starting playback when the terminal comes into view
    setShown({ lines: 0, chars: 0 })
    timer = setTimeout(step, 400)
    return () => clearTimeout(timer)
  }, [inView, reduced, lines])

  const playing = shown !== null && !reduced

  return (
    <div ref={ref} className={cn("overflow-hidden rounded-2xl border border-white/10 bg-night-deep shadow-[0_40px_100px_-40px_rgb(0_0_0/0.9)]", className)}>
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5b1f]/80" />
          <span className="size-2.5 rounded-full bg-[#ffb547]/70" />
          <span className="size-2.5 rounded-full bg-[var(--color-signal-finished-on-dark)]/70" />
        </span>
        {title && <span className="text-line font-mono text-xs">{title}</span>}
      </div>
      <pre className="relative overflow-x-auto p-5 font-mono text-[13px] leading-7">
        {/* The whole output, for everyone — and it holds the final height. */}
        <code className={cn("grid", playing && "invisible")} aria-hidden={playing || undefined}>
          {lines.map((l, i) => (
            <Line key={i} line={l} />
          ))}
        </code>
        {playing && (
          <code aria-hidden="true" className="absolute inset-5 grid content-start">
            {lines.slice(0, shown.lines).map((l, i) => (
              <Line key={i} line={l} />
            ))}
            {shown.lines < lines.length && lines[shown.lines]?.kind === "command" && (
              <Line line={{ kind: "command", text: lines[shown.lines]!.text.slice(0, shown.chars) }} caret />
            )}
          </code>
        )}
        {playing && <span className="sr-only">{lines.map((l) => l.text).join(". ")}</span>}
      </pre>
    </div>
  )
}

function Line({ line, caret = false }: { line: TerminalLine; caret?: boolean }) {
  if (line.kind === "command") {
    return (
      <span className="text-paper whitespace-pre-wrap">
        <span className="text-ember select-none">$ </span>
        {line.text}
        {caret && <span className="bg-ember ml-px inline-block h-[1.05em] w-[7px] translate-y-[0.2em] animate-pulse" />}
      </span>
    )
  }
  return (
    <span className={cn("whitespace-pre-wrap", line.kind === "ok" ? "text-paper/90" : "text-mist")}>
      <span className={cn("select-none", line.kind === "ok" ? "text-[var(--color-signal-finished-on-dark)]" : "text-line")}>{line.kind === "ok" ? "✔ " : "  "}</span>
      {line.text}
    </span>
  )
}
