// app/(public)/systems/[slug]/opengraph-image.tsx — a case study's Open Graph
// image (#101). Read through the masked PublicSystem view, exactly like the
// page: a hidden system gets the site card, never its own (nothing leaks), and
// an anonymised client stays anonymised (BR-1.4).

import { renderOgCard, OG_SIZE } from "@/lib/og";
import { getPublicSystemBySlug } from "@/lib/queries/systems";

export const alt = "A system on MALULEKE-KS";
export const size = OG_SIZE;
export const contentType = "image/png";

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
