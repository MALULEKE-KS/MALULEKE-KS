// components/shared/SocialLinks.tsx
// Real brand icons (Font Awesome brands via react-icons) — the actual
// LinkedIn, WhatsApp and GitHub marks, not look-alikes. Destinations come from
// OWNER (lib/content/sheets.ts), sourced from the README contact block. The
// phone number is never printed; WhatsApp is reached through its link only.

import { Mail } from "lucide-react";
import { FaGithub, FaLinkedinIn, FaWhatsapp } from "react-icons/fa6";
import { OWNER } from "@/lib/content/sheets";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "LinkedIn", href: OWNER.linkedin, Icon: FaLinkedinIn },
  { label: "GitHub", href: OWNER.github, Icon: FaGithub },
  { label: "WhatsApp", href: OWNER.whatsapp, Icon: FaWhatsapp },
  { label: "Email", href: `mailto:${OWNER.email}`, Icon: Mail },
];

export function SocialLinks({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  const dark = tone === "dark";
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {LINKS.map(({ label, href, Icon }) => {
        const external = !href.startsWith("mailto:");
        return (
          <li key={label}>
            <a
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              aria-label={label}
              title={label}
              className={cn(
                "grid size-11 place-items-center rounded-full border transition-[transform,background-color,border-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember motion-safe:hover:-translate-y-0.5",
                dark
                  ? "border-white/10 bg-white/5 text-mist hover:border-ember/60 hover:bg-ember/10 hover:text-paper"
                  : "border-ink/10 bg-sheet text-slate shadow-soft hover:border-ember/50 hover:text-ink",
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
