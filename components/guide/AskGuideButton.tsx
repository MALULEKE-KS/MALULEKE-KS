// components/guide/AskGuideButton.tsx
// A button that opens the AI guide — optionally with a question already asked
// ("Ask about this system"). Renders nothing while the guide is switched off.

"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useGuide } from "@/components/guide/GuideProvider";

export function AskGuideButton({
  question,
  children,
  variant = "glass",
  size = "lg",
  className,
}: {
  question?: string;
  children: React.ReactNode;
  variant?: "glass" | "accent" | "default";
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const { enabled, setOpen, ask } = useGuide();
  if (!enabled) return null;
  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={() => (question ? ask(question) : setOpen(true))}>
      <Image src="/character/guide-face.webp" alt="" width={24} height={24} className="-ml-1 size-6 rounded-full ring-1 ring-white/20" />
      {children}
    </Button>
  );
}
