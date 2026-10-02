// components/shared/SearchPalette.tsx
// Instant search (approved feature 5, #100): ⌘K / Ctrl+K or "/" opens a
// command palette over published systems, journey entries and skills
// (GET /api/v1/search — public views only, so a result is never hidden work;
// rate-limited per visitor). Results come from the server, ranked; the palette
// doesn't filter them again. Keyboard-first (cmdk + Radix: arrows, Enter, Esc,
// focus trap), and it degrades to a plain button that opens it.

"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Boxes, Search, Sparkles } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface Result {
  kind: "system" | "journey" | "skill";
  key: string;
  title: string;
  subtitle: string | null;
}

const GROUPS = [
  { kind: "system", heading: "Systems", Icon: Boxes },
  { kind: "journey", heading: "Journey", Icon: BookOpen },
  { kind: "skill", heading: "Skills", Icon: Sparkles },
] as const;

function hrefFor(r: Result): string {
  if (r.kind === "system") return `/systems/${r.key}`;
  if (r.kind === "journey") return `/journey#entry-${r.key}`;
  return "/about#skills";
}

const MIN_QUERY = 2; // the API's own minimum (SearchQuerySchema)
const noSubscribe = () => () => {};
const isMacPlatform = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const DEBOUNCE_MS = 180;

export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error" | "limited">("idle");
  // The shortcut hint: "Ctrl K" on the server, the platform's own on the client.
  const isMac = useSyncExternalStore(noSubscribe, isMacPlatform, () => false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fetch after a short pause in typing; a too-short query is simply shown as
  // the hint below (derived at render), so nothing here resets state.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setState("loading");
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}&limit=12`, {
          signal: ctrl.signal,
        });
        if (res.status === 429) return setState("limited");
        if (!res.ok) return setState("error");
        setResults((await res.json()) as Result[]);
        setState("idle");
      } catch (err) {
        if ((err as Error).name !== "AbortError") setState("error");
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  const tooShort = query.trim().length < MIN_QUERY;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-mist hover:text-paper focus-visible:outline-ember inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm transition-colors hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label="Search the site"
      >
        <Search aria-hidden="true" className="size-4" />
        <span className="hidden xl:inline">Search</span>
        <kbd className="text-line hidden rounded-md border border-white/10 px-1.5 font-mono text-[0.6875rem] xl:inline">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent hideClose aria-describedby="search-help">
          <DialogTitle className="sr-only">Search the site</DialogTitle>
          <DialogDescription id="search-help" className="sr-only">
            Search published systems, journey entries and skills. Use the arrow keys to choose a
            result and Enter to open it.
          </DialogDescription>
          <Command shouldFilter={false} loop>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search systems, journey, skills…"
              aria-label="Search"
            />
            <CommandList>
              {tooShort ? (
                <p className="text-mist px-3 py-8 text-center text-sm">
                  Type at least {MIN_QUERY} characters.
                </p>
              ) : state === "limited" ? (
                <p className="text-mist px-3 py-8 text-center text-sm">
                  Too many searches from this connection — try again shortly.
                </p>
              ) : state === "error" ? (
                <p className="text-mist px-3 py-8 text-center text-sm">
                  Search isn&rsquo;t available right now.
                </p>
              ) : (
                <>
                  {state !== "loading" && (
                    <CommandEmpty>Nothing matches &ldquo;{query.trim()}&rdquo;.</CommandEmpty>
                  )}
                  {GROUPS.map(({ kind, heading, Icon }) => {
                    const items = results.filter((r) => r.kind === kind);
                    if (items.length === 0) return null;
                    return (
                      <CommandGroup key={kind} heading={heading}>
                        {items.map((r) => (
                          <CommandItem
                            key={`${r.kind}-${r.key}`}
                            value={`${r.kind}-${r.key}`}
                            onSelect={() => go(hrefFor(r))}
                          >
                            <Icon aria-hidden="true" className="text-mist" />
                            <span className="min-w-0 flex-1 truncate">{r.title}</span>
                            {r.subtitle && (
                              <span className="text-line shrink-0 truncate font-mono text-xs">
                                {r.subtitle}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    );
                  })}
                </>
              )}
            </CommandList>
            <div className="text-line flex items-center justify-between border-t border-white/10 px-4 py-2.5 font-mono text-[0.6875rem]">
              <span>↑↓ to choose · Enter to open · Esc to close</span>
              {state === "loading" && <span aria-live="polite">Searching…</span>}
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
