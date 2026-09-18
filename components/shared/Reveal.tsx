// components/shared/Reveal.tsx
// The `reveal` motion (DESIGN-SYSTEM.md v2 §5): content rises and fades in
// once, when it first enters the viewport. The hidden state lives in CSS
// behind the `.js` class, so without JS — or before this hydrates — nothing
// is ever stuck invisible. Reduced motion is handled in globals.css.

"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number; // ms — stagger siblings by passing 0, 80, 160…
}

export function Reveal({ delay = 0, className, style, ...props }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal=""
      className={cn(className)}
      style={{ ...style, ["--delay" as string]: `${delay}ms` }}
      {...props}
    />
  );
}
