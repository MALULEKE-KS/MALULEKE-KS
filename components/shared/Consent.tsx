// components/shared/Consent.tsx
// The analytics consent gate (BR-5.1, BR-5.4; #102). Nothing that measures a
// visitor loads before they say yes: Vercel Web Analytics — the platform's one
// analytics provider — is rendered only after acceptance, and declining is
// honoured everywhere. The only thing stored before a choice is made is
// nothing at all; after it, the choice itself (localStorage, this device).
// The banner never blocks the page, and "Privacy choices" in the footer
// reopens it, so a visitor can change their mind at any time.
//
// First-party Event collection stays off until something uses it (V1.1's
// analytics dashboard) — data minimisation (POPIA): no collection without a use.

"use client";

import { createContext, useCallback, useContext, useState, useSyncExternalStore } from "react";
import { Analytics } from "@vercel/analytics/next";
import { ShieldCheck } from "lucide-react";

const STORAGE_KEY = "mks.consent.v1";
type Choice = "granted" | "denied";

const listeners = new Set<() => void>();
function readChoice(): Choice | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null; // storage blocked: treat as no choice (nothing loads)
  }
}
function writeChoice(choice: Choice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // storage blocked: the choice holds for this page view only
  }
  memo = choice;
  listeners.forEach((l) => l());
}
let memo: Choice | null | undefined;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => (memo === undefined ? (memo = readChoice()) : memo);

interface ConsentContextValue {
  reopen: () => void;
}
const ConsentContext = createContext<ConsentContextValue>({ reopen: () => {} });

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  // Server render and hydration: undefined ("not known yet") — neither the
  // banner nor analytics; the stored choice is read once on the client.
  const choice = useSyncExternalStore(subscribe, getSnapshot, () => undefined);
  const [open, setOpen] = useState(false);

  const reopen = useCallback(() => setOpen(true), []);
  const decide = (c: Choice) => {
    writeChoice(c);
    setOpen(false);
  };

  const showBanner = choice === null || (choice !== undefined && open);

  return (
    <ConsentContext.Provider value={{ reopen }}>
      {children}
      {choice === "granted" && <Analytics />}
      {showBanner && (
        <div
          role="region"
          aria-label="Privacy choices"
          className="no-print bg-night/95 text-paper shadow-lift fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-white/10 p-5 backdrop-blur-xl md:inset-x-auto md:right-6 md:bottom-6"
        >
          <div className="flex gap-4">
            <ShieldCheck aria-hidden="true" className="text-ember mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-sans font-semibold">Can I measure visits?</p>
              <p className="text-mist mt-1.5 text-sm leading-relaxed">
                Anonymous page-view counts (Vercel Analytics, no cookies) help me see what&rsquo;s
                useful. Nothing is measured unless you say yes, and you can change this any time
                from the footer.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => decide("granted")}
                  className="bg-ember text-ink focus-visible:outline-paper rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Allow
                </button>
                <button
                  type="button"
                  onClick={() => decide("denied")}
                  className="text-paper focus-visible:outline-ember rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  No thanks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConsentContext.Provider>
  );
}

/** The footer's "Privacy choices" — reopens the banner. */
export function PrivacyChoicesButton({ className }: { className?: string }) {
  const { reopen } = useContext(ConsentContext);
  return (
    <button type="button" onClick={reopen} className={className}>
      Privacy choices
    </button>
  );
}
