// components/shared/SiteFooter.tsx
// Brand + mission, the page index, and direct contact with real brand icons.
// The owner's name, email, location and links come from the admin-editable
// profile (#99); the page index from lib/content/sheets.ts. Colophon names the
// platform's actual stack.

import Link from "next/link";
import { BrandMark } from "@/components/shared/BrandMark";
import { Container } from "@/components/shared/Container";
import { SocialLinks } from "@/components/shared/SocialLinks";
import { PLATFORM_STACK, SHEETS } from "@/lib/content/sheets";
import type { SiteProfile } from "@/lib/queries/site";
import { PrivacyChoicesButton } from "@/components/shared/Consent";

export function SiteFooter({
  profile,
  reviewSlaHours,
}: {
  profile: SiteProfile;
  reviewSlaHours: number;
}) {
  return (
    <footer className="bg-night-deep text-paper relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      <Container className="grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Link
            href="/"
            className="focus-visible:outline-ember inline-flex items-center gap-3 rounded-md focus-visible:outline-2"
          >
            <BrandMark className="text-paper size-8" />
            <span className="font-mono text-sm font-medium">MALULEKE-KS</span>
          </Link>
          <p className="text-mist mt-6 max-w-sm font-serif text-lg leading-relaxed">
            Systems disciplined enough to be trusted with real money, real institutions and real
            people&rsquo;s outcomes.
          </p>
          <SocialLinks links={profile.links} email={profile.email} className="mt-8" />
        </div>

        <nav aria-label="Footer" className="md:col-span-3">
          <h2 className="text-line font-mono text-xs">Pages</h2>
          <ul className="mt-4 space-y-2.5">
            {SHEETS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="group text-mist hover:text-paper inline-flex items-baseline gap-3 text-sm transition-colors"
                >
                  <span className="text-line group-hover:text-ember font-mono text-xs transition-colors">
                    {s.number}
                  </span>
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-4">
          <h2 className="text-line font-mono text-xs">Write to me</h2>
          <a
            href={`mailto:${profile.email}`}
            className="text-paper hover:decoration-ember mt-4 inline-block font-sans text-lg break-all underline decoration-white/20 underline-offset-8 transition-colors"
          >
            {profile.email}
          </a>
          <p className="text-mist mt-3 text-sm">
            Every inquiry is reviewed within {reviewSlaHours} hours.
          </p>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="text-line flex flex-col gap-2 py-5 font-mono text-xs md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {profile.name}.
            {profile.location ? ` Engineered in ${profile.location}.` : ""}
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <PrivacyChoicesButton className="hover:text-paper underline-offset-4 transition-colors hover:underline" />
            <span>Built on {PLATFORM_STACK.join(" / ")}</span>
          </p>
        </Container>
      </div>
    </footer>
  );
}
