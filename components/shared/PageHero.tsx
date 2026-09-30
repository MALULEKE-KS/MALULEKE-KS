// components/shared/PageHero.tsx
// The opening band of every inner public page (DESIGN-SYSTEM.md v3 §3, #99):
// the same quiet graphite hero field as home, an icon pill that sets the
// context, the page title, one line of description, and optional supporting
// content (facts, actions) — so every page starts the way home does and the
// site alternates graphite and bone as the design system describes.

import type { LucideIcon } from "lucide-react";
import { Container } from "@/components/shared/Container";

interface PageHeroProps {
  icon: LucideIcon;
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Wider title block, e.g. for a long system name. */
  wide?: boolean;
}

export function PageHero({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  wide = false,
}: PageHeroProps) {
  return (
    <section aria-labelledby="page-title" className="hero-field text-paper overflow-hidden">
      <Container className="py-16 md:py-20">
        <div className={wide ? "max-w-4xl" : "max-w-3xl"}>
          <span className="text-mist inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
            <Icon aria-hidden="true" className="text-ember size-3.5" />
            {eyebrow}
          </span>
          <h1
            id="page-title"
            className="mt-6 font-sans text-4xl leading-[1.05] font-semibold tracking-tight md:text-6xl"
          >
            {title}
          </h1>
          {description && (
            <div className="text-mist mt-5 max-w-2xl text-lg leading-relaxed">{description}</div>
          )}
        </div>
        {children && <div className="mt-10">{children}</div>}
      </Container>
    </section>
  );
}
