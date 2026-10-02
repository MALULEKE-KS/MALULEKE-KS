// GET /.well-known/security.txt — how to report a security problem (RFC 9116;
// spec WP-203). Built from data: the owner's public contact email (profile)
// and the configured site URL (siteUrl()); Expires is a year ahead, so it is
// never stale.

import { getSiteProfile } from "@/lib/queries/site";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getSiteProfile();
  const base = siteUrl();
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  expires.setUTCHours(0, 0, 0, 0);
  const body = [
    `Contact: mailto:${profile.email}`,
    `Contact: ${base}/contact`,
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en",
    `Canonical: ${base}/.well-known/security.txt`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
