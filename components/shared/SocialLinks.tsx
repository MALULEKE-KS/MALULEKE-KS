// components/shared/SocialLinks.tsx
// Real brand icons (Font Awesome brands via react-icons) — the actual
// LinkedIn, WhatsApp and GitHub marks, not look-alikes. Destinations are the
// owner's profile links (ProfileLink, admin-editable, #99) plus the profile
// email; a link kind without a brand mark gets a plain link icon. The phone
// number is never printed; WhatsApp is reached through its link only.

import { Link2, Mail } from "lucide-react";
import { FaGithub, FaLinkedinIn, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import type { IconType } from "react-icons";
import type { SiteLink } from "@/lib/queries/site";
import { cn } from "@/lib/utils";

const BRAND_ICONS: Record<string, IconType> = {
  linkedin: FaLinkedinIn,
  github: FaGithub,
  whatsapp: FaWhatsapp,
  x: FaXTwitter,
  twitter: FaXTwitter,
};

interface SocialLinksProps {
  links: SiteLink[];
  email?: string | null;
  tone?: "dark" | "light";
  className?: string;
}

export function SocialLinks({ links, email, tone = "dark", className }: SocialLinksProps) {
  const dark = tone === "dark";
  const items = [
    ...links.map((l) => ({
      key: l.kind,
      label: l.label,
      href: l.url,
      Icon: BRAND_ICONS[l.kind.toLowerCase()] ?? Link2,
    })),
    ...(email ? [{ key: "email", label: "Email", href: `mailto:${email}`, Icon: Mail }] : []),
  ];

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {items.map(({ key, label, href, Icon }) => {
        const external = !href.startsWith("mailto:");
        return (
          <li key={key}>
            <a
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              aria-label={label}
              title={label}
              className={cn(
                "focus-visible:outline-ember grid size-11 place-items-center rounded-full border transition-[transform,background-color,border-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:hover:-translate-y-0.5",
                dark
                  ? "text-mist hover:border-ember/60 hover:bg-ember/10 hover:text-paper border-white/10 bg-white/5"
                  : "border-ink/10 bg-sheet text-slate shadow-soft hover:border-ember/50 hover:text-ink"
              )}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
