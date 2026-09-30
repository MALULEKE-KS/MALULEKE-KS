// lib/site-url.ts
// The site's own absolute URL — for canonical links, the sitemap, Open Graph,
// JSON-LD and the CV's portfolio links (#99, #101). Configuration, not code:
// SITE_URL when set (the custom domain, once there is one), else the Vercel
// project's production domain (a system variable Vercel provides), else the
// deployment's own URL, else local development.

export function siteUrl(): string {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production}`;
  const deployment = process.env.VERCEL_URL?.trim();
  if (deployment) return `https://${deployment}`;
  return "http://localhost:3000";
}
