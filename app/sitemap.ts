// app/sitemap.ts — /sitemap.xml (Constitution §9 SEO, #101). The public pages
// and every live system, from the PublicSystem view — so a draft, archived,
// scheduled (BR-1.13) or otherwise hidden system is never listed. Absolute
// URLs from the configured site URL.

import type { MetadataRoute } from "next";
import { dbPublic } from "@/lib/db";
import { SHEETS } from "@/lib/content/sheets";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const systems = await dbPublic.publicSystem.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { slug: "asc" },
  });
  return [
    ...SHEETS.map((s) => ({
      url: `${base}${s.href === "/" ? "" : s.href}`,
      changeFrequency: "weekly" as const,
      priority: s.href === "/" ? 1 : 0.7,
    })),
    ...systems.map((s) => ({
      url: `${base}/systems/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
