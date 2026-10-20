// components/guide/AskGuideButton.tsx
// A button that opens the AI guide — optionally with a question already asked
// ("Ask about this system"). Renders nothing while the guide is switched off.

"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuide } from "@/components/guide/GuideProvider";

export function AskGuideButton({
  question,
  children,
  variant = "glass",
  size = "lg",
  showFace = true,
  className,
}: {
  question?: string;
  children: React.ReactNode;
  variant?: "glass" | "accent" | "default";
  size?: "default" | "sm" | "lg";
  /** The guide's small face in the button; off where a quieter mark is wanted (the home hero). */
  showFace?: boolean;
  className?: string;
}) {
  const { enabled, setOpen, ask } = useGuide();
  if (!enabled) return null;
  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={() => (question ? ask(question) : setOpen(true))}>
      {showFace ? (
        <Image src="/character/guide-face.webp" alt="" width={24} height={24} className="-ml-1 size-6 rounded-full ring-1 ring-white/20" />
      ) : (
        <Sparkles aria-hidden="true" className="text-ember size-4" />
      )}
      {children}
    </Button>
  );
}
