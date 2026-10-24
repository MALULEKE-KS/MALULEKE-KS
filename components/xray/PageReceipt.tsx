// components/xray/PageReceipt.tsx
// The strip at the foot of the home hero (D-067, the owner's request for "something unique and
// outstanding" where the record was): the page's receipt — when this cached copy was rendered,
// the build and the rules the database holds (from the server), then, measured in the visitor's
// own browser once the page is idle, how fast its first byte came and which edge served it — and
// the "See how this page works" switch. Every word is the owner's ("page-xray" block); a label
// he leaves empty hides its part, and a fact that can't be measured (a local build, a page
// reached without a full load) is left out, never guessed.
//
// The measured parts are appended to one line that never wraps, after the server's, so they move
// nothing on arrival (no layout shift); the switch has its own place.

"use client";

import { useEffect, useState } from "react";
import { edgeRegion, fill, type ReceiptCopy, type XrayCopy } from "@/lib/xray/copy";
import { Container } from "@/components/shared/Container";
import { XraySwitch } from "@/components/xray/XraySwitch";

interface Measured {
  seconds: string | null;
  region: string | null;
  cache: string | null;
}

export function PageReceipt({
  copy,
  rendered,
  build,
  rules,
  xray,
  source,
}: {
  copy: ReceiptCopy;
  /** When this copy was rendered, already written in the site's time zone ("14:05 SAST"). */
  rendered: string;
  /** The running build and its commit on GitHub; null off Vercel. */
  build: { commit: string; url: string } | null;
  rules: number;
  xray: XrayCopy | null;
  source: { repository: string; commit: string | null };
}) {
  const [measured, setMeasured] = useState<Measured | null>(null);

  useEffect(() => {
    let cancelled = false;
    const measure = async () => {
      // First byte: only when this page was the one loaded in full (not reached by a link inside the site).
      const nav = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      const landed = nav && new URL(nav.name).pathname === location.pathname;
      const seconds =
        landed && nav.responseStart > 0
          ? ((nav.responseStart - nav.startTime) / 1000).toFixed(2)
          : null;
      // The edge: asked of the same page, headers only — Vercel's x-vercel-id names the edge that answered.
      let region: string | null = null;
      let cache: string | null = null;
      try {
        const res = await fetch(location.pathname, { method: "HEAD", cache: "no-store" });
        region = edgeRegion(res.headers.get("x-vercel-id"));
        cache = region ? res.headers.get("x-vercel-cache") : null;
      } catch {
        // Offline or blocked: the receipt keeps what the server knows.
      }
      if (!cancelled) setMeasured({ seconds, region, cache });
    };
    const start = () =>
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(() => void measure(), { timeout: 4000 })
        : setTimeout(() => void measure(), 1500);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
    };
  }, []);

  const items: { key: string; text: string; href?: string }[] = [];
  const add = (key: string, text: string | null, href?: string) =>
    text && items.push({ key, text, href });
  add("rendered", fill(copy.renderedLabel, "time", rendered));
  if (build) add("build", fill(copy.buildLabel, "commit", build.commit), build.url);
  add("rules", fill(copy.rulesLabel, "count", rules));
  if (measured?.seconds) add("first-byte", fill(copy.firstByteLabel, "seconds", measured.seconds));
  if (measured?.region) add("edge", fill(copy.edgeLabel, "region", measured.region));
  if (measured?.cache) add("cache", fill(copy.cacheLabel, "cache", measured.cache.toUpperCase()));

  const showReceipt = copy.receiptLabel && items.length > 0;
  if (!showReceipt && !xray) return null;

  return (
    <div
      className="hero-rise relative z-10 border-t border-white/[0.08] bg-[rgb(11_12_14/0.55)] backdrop-blur-md max-lg:pb-[var(--dock-space,0px)]"
      style={{ "--i": 6 } as React.CSSProperties}
    >
      <Container className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:gap-6">
        {showReceipt && (
          <div
            // A line that scrolls sideways on a phone, so it takes the keyboard too (axe: scrollable-region-focusable).
            role="group"
            tabIndex={0}
            className="receipt-line focus-visible:outline-ember text-mist min-w-0 flex-1 overflow-x-auto rounded-sm font-mono text-[11px] leading-6 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={copy.receiptLabel ?? undefined}
          >
            <span className="text-paper/90 mr-2.5 rounded-sm border border-white/15 px-1.5 py-0.5 tracking-[0.12em] uppercase">
              {copy.receiptLabel}
            </span>
            {items.map((item, i) => (
              <span
                key={item.key}
                className={
                  item.key === "first-byte" || item.key === "edge" || item.key === "cache"
                    ? "receipt-arrive"
                    : undefined
                }
              >
                {i > 0 && (
                  <span aria-hidden="true" className="text-line mx-2">
                    ·
                  </span>
                )}
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-paper/85 hover:text-ember underline decoration-white/25 underline-offset-4 transition-colors"
                  >
                    {item.text}
                  </a>
                ) : (
                  <span className="text-paper/85">{item.text}</span>
                )}
              </span>
            ))}
          </div>
        )}
        {xray && <XraySwitch copy={xray} source={source} />}
      </Container>
    </div>
  );
}
