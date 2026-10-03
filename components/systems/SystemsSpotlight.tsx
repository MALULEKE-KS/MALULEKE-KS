// components/systems/SystemsSpotlight.tsx
// /systems — the spotlight: every published system on a coverflow ring
// (21st.dev Coverflow Carousel, adapted — components/ui/coverflow-carousel.tsx),
// in the catalog's featured order. A system with a live site shows its real
// screenshot (BR-1.18); every other one is a card drawn from its own data —
// name, status, where it lives, what it's built with — never a stock image.
// The centre card opens its case study; the caption under the ring says which
// system it is and links there too, so nothing depends on dragging.

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CoverflowCarousel } from "@/components/ui/coverflow-carousel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { techMark } from "@/components/shared/TechChip";
import type { CatalogSystem } from "@/lib/queries/catalog";
import { cn } from "@/lib/utils";

type Slide = Pick<CatalogSystem, "slug" | "name" | "description" | "status" | "statusColorToken" | "home" | "domain" | "tech" | "screenshotUrl">;

function Face({ s, active }: { s: Slide; active: boolean }) {
  if (s.screenshotUrl) {
    return (
      <span className="bg-night relative block size-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- the screenshot route is ours, versioned by content hash */}
        <img src={s.screenshotUrl} alt="" draggable={false} loading="lazy" className="size-full object-cover object-top" />
        <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgb(11_12_14/0.92),transparent)] p-4 pt-12">
          <span className="text-paper block truncate font-sans text-lg font-semibold">{s.name}</span>
        </span>
      </span>
    );
  }
  // No screenshot: the system's own card, from its data.
  return (
    <span className={cn("bg-night text-paper relative flex size-full flex-col justify-between overflow-hidden p-5", active && "ring-ember/40 ring-1 ring-inset")}>
      <span aria-hidden="true" className="absolute -top-16 -right-10 size-48 rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.28),transparent)]" />
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.06)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(to_bottom,#000,transparent_70%)]" />
      <span className="relative flex items-center justify-between gap-2">
        <StatusBadge label={s.status} colorToken={s.statusColorToken} onDark />
        {s.home && <span className="text-mist truncate font-mono text-[10px] tracking-wide uppercase">{s.home}</span>}
      </span>
      <span className="relative">
        <span className="block font-sans text-xl leading-tight font-semibold tracking-tight sm:text-2xl">{s.name}</span>
        <span className="text-mist mt-1.5 line-clamp-2 block text-xs leading-snug sm:text-[13px]">{s.description}</span>
      </span>
      {s.tech.length > 0 && (
        <span className="relative flex flex-wrap items-center gap-1.5">
          {s.tech.slice(0, 5).map((t) => (
            <span key={t} className="text-paper/90 inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[10px]">
              {techMark(t)}
              {t}
            </span>
          ))}
          {s.tech.length > 5 && <span className="text-mist font-mono text-[10px]">+{s.tech.length - 5}</span>}
        </span>
      )}
    </span>
  );
}

export function SystemsSpotlight({ systems }: { systems: Slide[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  if (systems.length < 3) return null; // a ring needs a few to be a ring
  const current = systems[index] ?? systems[0]!;
  return (
    <div>
      <CoverflowCarousel
        slides={systems}
        label="Systems spotlight"
        slideLabel={(s) => s.name}
        aspect={16 / 10}
        cardWidth="clamp(230px, 62vw, 400px)"
        rotate={40}
        depth={0.5}
        fade={0.16}
        onSelect={setIndex}
        onActivate={(s) => router.push(`/systems/${s.slug}`)}
        renderSlide={(s, { active }) => <Face s={s} active={active} />}
      />
      <p className="mt-3 text-center" aria-live="polite">
        <Link href={`/systems/${current.slug}`} className="text-paper hover:text-ember focus-visible:outline-ember inline-flex items-center gap-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2">
          {current.name}
          {current.domain && <span className="text-mist font-normal">· {current.domain}</span>}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </p>
    </div>
  );
}
