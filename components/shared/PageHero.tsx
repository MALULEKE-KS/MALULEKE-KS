// components/shared/PageHero.tsx
// The opening band of an inner public page (DESIGN-SYSTEM.md v3 §3, #99), in the
// shape every inner hero shares (D-046): the same graphite hero field as home, a
// plain label (HeroLabel — no pill), the page title, one or two lines of
// description, and optional supporting content (the live figures, a spotlight) —
// so every page starts the way home does and the site alternates graphite and
// bone as the design system describes.

import { Container } from "@/components/shared/Container";
import { HeroLabel } from "@/components/shared/HeroKit";

interface PageHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Wider title block, e.g. for a long system name. */
  wide?: boolean;
  /** The image behind the band (PageHeroBackdrop) — omitted, the band keeps its graphite field. */
  backdrop?: React.ReactNode;
}

export function PageHero({ eyebrow, title, description, children, wide = false, backdrop }: PageHeroProps) {
  return (
    <section aria-labelledby="page-title" className="hero-field text-paper relative isolate overflow-hidden">
      {backdrop}
      <Container className="pt-28 pb-14 md:pt-32 md:pb-20">
        <div className={wide ? "max-w-4xl" : "max-w-3xl"}>
          <HeroLabel>{eyebrow}</HeroLabel>
          <h1 id="page-title" className="type-display mt-6">
            {title}
          </h1>
          {description && <div className="type-lede text-mist mt-5 max-w-2xl">{description}</div>}
        </div>
        {children && <div className="mt-10 md:mt-12">{children}</div>}
      </Container>
    </section>
  );
}
