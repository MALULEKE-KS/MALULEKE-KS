// components/guide/GuideProvider.tsx
// The AI guide's shared state (PUBLIC-REDESIGN-PLAN §3a): whether the chat is
// open, the character's mood (idle / attentive / thinking / speaking) and
// pose (none / wave / point), and a way for the chat to make it speak. The
// hero character, the docked launcher and the chat panel all read this —
// the state machine is the only interface between the body and the brain,
// so a Live2D rig can replace the body later without touching the chat.
//
// It also holds the visitor's lens (Constitution §4) for the session, and a
// question the page hands to the chat (a lens chip, "Ask about this system").

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { GuideMood, Rig } from "@/components/guide/rig";
import type { PublicLens } from "@/lib/queries/lenses";

export type GuidePose = "none" | "wave" | "point" | "thinking";

const LENS_KEY = "mks.lens";
/** How long a pose holds before the character returns to its rig. */
export const POSE_MS = 5000;

/** The visitor's lens as saved for this session — read at send time by the chat. */
export function readSessionLens(): string | null {
  try {
    return sessionStorage.getItem(LENS_KEY);
  } catch {
    return null;
  }
}

interface GuideState {
  /** Whether the guide is switched on for visitors (the concierge flag, BR-4.4). */
  enabled: boolean;
  /** Whether a model provider is connected; otherwise the guide is resting. */
  ready: boolean;
  /** The owner's first name, for "Kurhula's AI guide". From the profile, never code. */
  ownerFirstName: string;
  lenses: PublicLens[];
  /** Hosts the guide's answers may link to: GitHub and the owner's own profiles. */
  linkHosts: string[];
  open: boolean;
  setOpen: (open: boolean) => void;
  mood: GuideMood;
  setMood: (mood: GuideMood) => void;
  pose: GuidePose;
  /** Show a pose for a moment, then return to the rig. */
  flashPose: (pose: Exclude<GuidePose, "none">, ms?: number) => void;
  /** The chat streams text here; the mouth follows it. */
  speak: (text: string) => void;
  registerRig: (rig: Rig) => () => void;
  /** The hero character is on screen — the docked launcher steps aside. */
  heroInView: boolean;
  setHeroInView: (inView: boolean) => void;
  /** The visitor's lens for this session, or null until they pick one. */
  lens: string | null;
  setLens: (key: string | null) => void;
  /** A question waiting for the chat: open it and ask. */
  pending: string | null;
  ask: (question: string) => void;
  clearPending: () => void;
}

const GuideContext = createContext<GuideState | null>(null);

export function GuideProvider({
  enabled,
  ready,
  ownerFirstName,
  lenses,
  linkHosts,
  children,
}: {
  enabled: boolean;
  ready: boolean;
  ownerFirstName: string;
  lenses: PublicLens[];
  linkHosts: string[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mood, setMoodState] = useState<GuideMood>("idle");
  const [pose, setPose] = useState<GuidePose>("none");
  const [heroInView, setHeroInView] = useState(false);
  const [lens, setLensState] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const rigs = useRef(new Set<Rig>());
  const poseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The lens lasts the session — no login, no cookie (Constitution §4).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(LENS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the session once, after hydration
      if (saved && lenses.some((l) => l.key === saved)) setLensState(saved);
    } catch {
      // Storage blocked: the lens simply isn't remembered.
    }
  }, [lenses]);

  const setLens = useCallback((key: string | null) => {
    setLensState(key);
    try {
      if (key) sessionStorage.setItem(LENS_KEY, key);
      else sessionStorage.removeItem(LENS_KEY);
    } catch {
      // Storage blocked: fine for this page view.
    }
  }, []);

  const setMood = useCallback((next: GuideMood) => {
    setMoodState(next);
    rigs.current.forEach((r) => r.setMood(next));
  }, []);

  // A pose holds for POSE_MS (owner, 2026-10-01: "at least 5 sec") — unless the
  // visitor clicks or presses a key, which hands the character back to the rig.
  const flashPose = useCallback((next: Exclude<GuidePose, "none">, ms = POSE_MS) => {
    if (poseTimer.current) clearTimeout(poseTimer.current);
    setPose(next);
    poseTimer.current = setTimeout(() => setPose("none"), ms);
  }, []);

  useEffect(() => {
    if (pose === "none") return;
    const end = () => {
      if (poseTimer.current) clearTimeout(poseTimer.current);
      setPose("none");
    };
    window.addEventListener("pointerdown", end);
    window.addEventListener("keydown", end);
    return () => {
      window.removeEventListener("pointerdown", end);
      window.removeEventListener("keydown", end);
    };
  }, [pose]);

  const speak = useCallback((text: string) => rigs.current.forEach((r) => r.speak(text)), []);

  const registerRig = useCallback((rig: Rig) => {
    rigs.current.add(rig);
    return () => {
      rigs.current.delete(rig);
    };
  }, []);

  const ask = useCallback((question: string) => {
    setPending(question);
    setOpen(true);
  }, []);

  const clearPending = useCallback(() => setPending(null), []);

  const value = useMemo(
    () => ({
      enabled, ready, ownerFirstName, lenses, linkHosts, open, setOpen, mood, setMood, pose, flashPose, speak, registerRig,
      heroInView, setHeroInView, lens, setLens, pending, ask, clearPending,
    }),
    [enabled, ready, ownerFirstName, lenses, linkHosts, open, mood, setMood, pose, flashPose, speak, registerRig, heroInView, lens, setLens, pending, ask, clearPending],
  );
  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

export function useGuide() {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error("useGuide must be used inside <GuideProvider>");
  return ctx;
}
