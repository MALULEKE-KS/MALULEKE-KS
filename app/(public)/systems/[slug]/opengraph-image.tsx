// app/(public)/systems/[slug]/opengraph-image.tsx — a case study's Open Graph
// image (#101). Read through the masked PublicSystem view, exactly like the
// page: a hidden system gets the site card, never its own (nothing leaks), and
// an anonymised client stays anonymised (BR-1.4).

import { renderOgCard, OG_SIZE } from "@/lib/og";
import { getPublicSystemBySlug } from "@/lib/queries/systems";

// One image per system, with alt text that says which system it is (spec
// WP-101 — not a generic "A system on …"). Served at …/opengraph-image/card.
// params may arrive as a promise (Next 16) or be empty while the build collects page
// data — await it, and fall back to the site's card when there's no slug yet.
export async function generateImageMetadata({ params }: { params: Promise<{ slug?: string }> | { slug?: string } }) {
  const { slug } = await params;
  const system = slug ? await getPublicSystemBySlug(slug) : null;
  const alt = system ? `${system.name} — ${system.description}`.slice(0, 200) : "The systems — MALULEKE-KS";
  return [{ id: "card", alt, size: OG_SIZE, contentType: "image/png" }];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const system = await getPublicSystemBySlug(slug);
  if (!system) return renderOgCard({ eyebrow: "MALULEKE-KS", title: "The systems" });
  return renderOgCard({
    eyebrow: [system.organization, system.domain].filter(Boolean).join(" / ") || "System",
    title: system.name,
    subtitle: system.description,
    badge: system.status,
  });
}
