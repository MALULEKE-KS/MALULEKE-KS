// components/xray/XrayOverlay.tsx
// The X-ray itself (D-067), downloaded when a visitor turns it on. Every section the page marks
// with data-xray gets a dashed outline and a label pinned under the header while it is on
// screen: the section's name and how many database objects, endpoints and business rules stand
// behind it. A label opens the section's wiring — each capability (what it puts there, what it
// reads, the endpoints that serve it, linked when a browser can open them), every rule it keeps
// as the enforcement register states it, and the component's source at the running build.
// Nothing here is written by hand: the facts are lib/xray/home.generated.json (the capability
// map and the register, kept current by tests/unit/xray.test.ts), the words the owner's.

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CircleDashed,
  CircleDot,
  Clock3,
  Database,
  ExternalLink,
  FileCode2,
  Server,
  ShieldCheck,
  ShieldX,
  X,
  type LucideIcon,
} from "lucide-react";
import manifest from "@/lib/xray/home.generated.json";
import type { XrayManifest, XrayStatus } from "@/lib/xray/build";
import type { XrayCopy } from "@/lib/xray/copy";
import { Container } from "@/components/shared/Container";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface XrayOverlayProps {
  copy: XrayCopy;
  source: { repository: string; commit: string | null };
  onClose: () => void;
}

const MANIFEST = manifest as XrayManifest;

const STATUS: Record<XrayStatus, { icon: LucideIcon; className: string }> = {
  enforced: {
    icon: ShieldCheck,
    className:
      "text-[var(--color-signal-finished-on-dark)] border-[var(--color-signal-finished-on-dark)]/30 bg-[var(--color-signal-finished-on-dark)]/10",
  },
  partial: { icon: CircleDot, className: "text-ember border-ember/30 bg-ember/10" },
  missing: { icon: ShieldX, className: "text-ember border-ember/40 bg-ember/15" },
  building: { icon: CircleDashed, className: "text-mist border-white/15 bg-white/5" },
  deferred: { icon: Clock3, className: "text-mist border-white/15 bg-white/5" },
};

const SECTIONS = new Map(MANIFEST.sections.map((s) => [s.key, s]));

const unique = (lists: string[][]) => [...new Set(lists.flat())];

/** A GET with no path parameters is something a browser can open: link it to the live endpoint. */
const openable = (endpoint: string) =>
  /^GET \/[^{}]*$/.test(endpoint) ? `/api/v1${endpoint.slice(4)}` : null;

export default function XrayOverlay({ copy, source, onClose }: XrayOverlayProps) {
  // One anchor for the top of each marked section — the label sticks inside it while the section is on screen.
  // Made once, when the overlay first renders (it only ever renders in the browser, after the switch), and
  // put in place by the effect below.
  const [anchors] = useState(() =>
    [...document.querySelectorAll<HTMLElement>("[data-xray]")].flatMap((el) => {
      const key = el.dataset.xray!;
      if (!SECTIONS.has(key)) return [];
      const node = document.createElement("div");
      node.className = "xray-anchor";
      return [{ key, el, node }];
    }),
  );
  const [open, setOpen] = useState<string | null>(null);
  const openRef = useRef(open);
  const closeRef = useRef(onClose);
  useEffect(() => {
    openRef.current = open;
    closeRef.current = onClose;
  });
  const sections = SECTIONS;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-xray-mode", "on");
    for (const a of anchors) a.el.prepend(a.node);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !openRef.current) closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      for (const a of anchors) a.node.remove();
      root.removeAttribute("data-xray-mode");
    };
  }, [anchors]);

  const label = (key: string) => copy.sectionLabels[key] ?? key;
  const current = open ? sections.get(open) : null;
  const ref = source.commit ?? "main";
  const blob = (path: string) =>
    `https://github.com/${source.repository}/blob/${ref}/${path.split("/").map(encodeURIComponent).join("/")}`;

  return (
    <>
      {anchors.map(({ key, node }) => {
        const s = sections.get(key)!;
        const db = unique(s.capabilities.map((c) => c.db)).length;
        const endpoints = unique(s.capabilities.map((c) => c.endpoints)).length;
        const rules = unique(s.capabilities.map((c) => c.rules)).length;
        return createPortal(
          <Container className="xray-tag-row">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setOpen(key)}
              className="xray-tag tap-target focus-visible:outline-ember inline-flex items-center gap-2.5 rounded-full py-1.5 pr-2 pl-3 text-[12px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span aria-hidden="true" className="bg-ember size-1.5 rounded-full" />
              <span className="text-paper">{label(key)}</span>
              <span className="text-mist inline-flex items-center gap-2 font-mono text-[11px]">
                <span
                  className="inline-flex items-center gap-1"
                  title={copy.readsLabel ?? undefined}
                >
                  <Database aria-hidden="true" className="size-3" />
                  {db}
                  {copy.readsLabel && <span className="sr-only">{copy.readsLabel}</span>}
                </span>
                <span
                  className="inline-flex items-center gap-1"
                  title={copy.servedLabel ?? undefined}
                >
                  <Server aria-hidden="true" className="size-3" />
                  {endpoints}
                  {copy.servedLabel && <span className="sr-only">{copy.servedLabel}</span>}
                </span>
                <span
                  className="inline-flex items-center gap-1"
                  title={copy.rulesHeading ?? undefined}
                >
                  <ShieldCheck aria-hidden="true" className="size-3" />
                  {rules}
                  {copy.rulesHeading && <span className="sr-only">{copy.rulesHeading}</span>}
                </span>
              </span>
            </button>
          </Container>,
          node,
          key
        );
      })}

      {/* The way out, on every screen: above the phone's dock, Escape on a keyboard. */}
      <div role="status" className="above-dock fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4">
        <div className="xray-tag text-paper flex items-center gap-3 rounded-full py-1.5 pr-1.5 pl-4 text-[13px] shadow-lg">
          <span
            aria-hidden="true"
            className="bg-ember size-2 animate-pulse rounded-full motion-reduce:animate-none"
          />
          {copy.onLabel && (
            <span className="max-w-[52vw] truncate sm:max-w-none">{copy.onLabel}</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="tap-target bg-paper text-ink hover:bg-paper/90 focus-visible:outline-ember inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <X aria-hidden="true" className="size-3.5" />
            {copy.offLabel ?? <span className="sr-only">{copy.switchLabel}</span>}
          </button>
        </div>
      </div>

      <Dialog open={current != null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="top-auto bottom-0 max-w-2xl rounded-b-none sm:top-[8vh] sm:bottom-auto sm:rounded-2xl">
          {current && (
            <div className="max-h-[84vh] overflow-y-auto p-5 sm:max-h-[80vh] sm:p-6">
              <p className="text-ember type-micro inline-flex items-center gap-1.5 font-medium">
                <span aria-hidden="true" className="bg-ember size-1.5 rounded-full" />
                {copy.switchLabel}
              </p>
              <DialogTitle className="mt-1 pr-8 text-lg font-semibold tracking-tight">
                {label(current.key)}
              </DialogTitle>
              {copy.intro ? (
                <DialogDescription className="text-mist mt-1 text-[13px] leading-relaxed">
                  {copy.intro}
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">{label(current.key)}</DialogDescription>
              )}

              <div className="mt-5 grid gap-3">
                {current.capabilities.map((c) => (
                  <article
                    key={c.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h3 className="text-[15px] leading-snug font-semibold">{c.title}</h3>
                      <code className="text-line font-mono text-[11px]">{c.id}</code>
                    </div>
                    <p className="text-mist mt-1 text-[13px] leading-relaxed">{c.summary}</p>
                    <dl className="mt-3 grid gap-3 text-[13px]">
                      {copy.showsLabel && (
                        <div>
                          <dt className="text-mist type-micro font-medium">{copy.showsLabel}</dt>
                          <dd className="mt-1">
                            <ul className="grid gap-1 leading-relaxed">
                              {c.shows.map((line) => (
                                <li key={line} className="flex gap-2">
                                  <span aria-hidden="true" className="text-ember">
                                    ›
                                  </span>
                                  {line}
                                </li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                      )}
                      {c.db.length > 0 && (
                        <div>
                          <dt className="text-mist type-micro inline-flex items-center gap-1.5 font-medium">
                            <Database aria-hidden="true" className="size-3" />
                            {copy.readsLabel}
                          </dt>
                          <dd className="mt-1.5 flex flex-wrap gap-1.5">
                            {c.db.map((d) => (
                              <code
                                key={d}
                                className="bg-night/70 rounded-md border border-white/[0.08] px-1.5 py-0.5 font-mono text-[11.5px]"
                              >
                                {d}
                              </code>
                            ))}
                          </dd>
                        </div>
                      )}
                      {c.endpoints.length > 0 && (
                        <div>
                          <dt className="text-mist type-micro inline-flex items-center gap-1.5 font-medium">
                            <Server aria-hidden="true" className="size-3" />
                            {copy.servedLabel}
                          </dt>
                          <dd className="mt-1.5 flex flex-wrap gap-1.5">
                            {c.endpoints.map((e) => {
                              const href = openable(e);
                              const body = (
                                <span className="font-mono text-[11.5px]">
                                  {e.replace(/^(\w+) /, "$1 /api/v1")}
                                </span>
                              );
                              return href ? (
                                <a
                                  key={e}
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:border-ember/40 hover:text-paper bg-night/70 inline-flex items-center gap-1 rounded-md border border-white/[0.08] px-1.5 py-0.5 transition-colors"
                                >
                                  {body}
                                  <ExternalLink aria-hidden="true" className="text-mist size-3" />
                                </a>
                              ) : (
                                <span
                                  key={e}
                                  className="bg-night/70 rounded-md border border-white/[0.08] px-1.5 py-0.5"
                                >
                                  {body}
                                </span>
                              );
                            })}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </article>
                ))}
              </div>

              {(() => {
                const ids = unique(current.capabilities.map((c) => c.rules)).sort((a, b) =>
                  a.localeCompare(b, "en", { numeric: true })
                );
                if (ids.length === 0) return null;
                return (
                  <section className="mt-6">
                    <h3 className="text-mist type-micro inline-flex items-center gap-1.5 font-medium">
                      <ShieldCheck aria-hidden="true" className="size-3" />
                      {copy.rulesHeading}
                    </h3>
                    <ul className="mt-2 grid gap-2">
                      {ids.map((id) => {
                        const rows = MANIFEST.rules[id] ?? [];
                        return (
                          <li
                            key={id}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-[13px] leading-relaxed"
                          >
                            <div className="flex flex-wrap items-start gap-x-2.5 gap-y-1">
                              <code className="text-ember shrink-0 font-mono text-[12px] font-semibold">
                                {id}
                              </code>
                              <div className="grid min-w-0 flex-1 gap-1.5">
                                {rows.length === 0 && <span className="text-mist">—</span>}
                                {rows.map((r, i) => {
                                  const s = STATUS[r.status];
                                  const word = copy.statusLabels[r.status];
                                  return (
                                    <div key={i}>
                                      <p>{r.claim}</p>
                                      <p className="mt-1 flex flex-wrap items-center gap-2">
                                        {word && (
                                          <span
                                            className={cn(
                                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                              s.className
                                            )}
                                          >
                                            <s.icon aria-hidden="true" className="size-3" />
                                            {word}
                                          </span>
                                        )}
                                        {r.layer && (
                                          <span className="text-line text-[11.5px]">{r.layer}</span>
                                        )}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })()}

              <section className="mt-6">
                <h3 className="text-mist type-micro inline-flex items-center gap-1.5 font-medium">
                  <FileCode2 aria-hidden="true" className="size-3" />
                  {copy.sourceLabel}
                </h3>
                <ul className="mt-2 grid gap-1.5">
                  {[current.source, "lib/capabilities/map.ts", "docs/ENFORCEMENT-REGISTER.md"].map(
                    (path) => (
                      <li key={path}>
                        <a
                          href={blob(path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/l hover:border-ember/40 focus-visible:outline-ember bg-night/60 flex items-center gap-2.5 rounded-xl border border-white/[0.08] px-3 py-2 text-[13px] transition-colors focus-visible:outline-2"
                        >
                          <FileCode2 aria-hidden="true" className="text-ember size-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate font-mono text-[12px]">
                            {path}
                          </span>
                          <span className="text-line shrink-0 font-mono text-[11px]">
                            @{ref.slice(0, 7)}
                          </span>
                          <ExternalLink
                            aria-hidden="true"
                            className="text-mist group-hover/l:text-paper size-3.5 shrink-0"
                          />
                          <span className="sr-only">(opens GitHub in a new tab)</span>
                        </a>
                      </li>
                    )
                  )}
                </ul>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
