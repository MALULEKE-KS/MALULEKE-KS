// components/home/orbit/OrbitPlayButton.tsx
// The phone hero's second action (owner, 2026-10-25: the hero's Let's talk duplicated the header's): it takes
// the visitor down to the Orbit and plays the 26 weeks from the first (OrbitStage listens for "orbit:play").

"use client";

import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OrbitPlayButton({ label, className }: { label: string; className?: string }) {
  return (
    <Button type="button" variant="accent" size="lg" className={className} onClick={() => window.dispatchEvent(new CustomEvent("orbit:play"))}>
      <Play className="fill-current" />
      {label}
    </Button>
  );
}
