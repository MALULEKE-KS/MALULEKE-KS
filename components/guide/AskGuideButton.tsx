// components/guide/AskGuideButton.tsx
// A button that opens the AI guide — optionally with a question already asked
// ("Ask about this system"). Renders nothing while the guide is switched off.

"use client";

import { Sparkles } from "lucide-react";
import { CubeMark } from "@/components/shared/BrandMark";
import { Button } from "@/components/ui/button";
import { useGuide } from "@/components/guide/GuideProvider";

export function AskGuideButton({
  question,
  children,
  variant = "glass",
  size = "lg",
  showMark = true,
  className,
}: {
  question?: string;
  children: React.ReactNode;
  variant?: "glass" | "accent" | "default";
  size?: "default" | "sm" | "lg";
  /** The guide's mark (the site's K-S cube, D-044) in the button; off where a quieter sign is wanted (the home hero). */
  showMark?: boolean;
  className?: string;
}) {
  const { enabled, setOpen, ask } = useGuide();
  if (!enabled) return null;
  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={() => (question ? ask(question) : setOpen(true))}>
      {showMark ? (
        <CubeMark spin={false} className="-ml-1 size-6 ring-1 ring-white/20" />
      ) : (
        <Sparkles aria-hidden="true" className="text-ember size-4" />
      )}
      {children}
    </Button>
  );
}
