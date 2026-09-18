// components/shared/SiteFooter.tsx
// Persistent, low-noise contact affordances across every public page — the
// conventional home for this, not the header (which stays focused on
// primary nav + the real /contact inquiry form as the primary CTA).
// Real destinations only, sourced from the README's own contact block —
// never placeholder links.

const CONTACT_LINKS = [
  {
    label: "LinkedIn",
    href: "https://za.linkedin.com/in/kurhula-success-maluleke-32153231a",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/27640708649",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    label: "Email",
    href: "mailto:kurhula04s@gmail.com",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate/20 bg-paper mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <a
          href="https://github.com/MALULEKE-KS"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] text-slate uppercase tracking-widest hover:text-accent transition-colors"
        >
          MALULEKE-KS
        </a>

        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          {CONTACT_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("mailto:") ? undefined : "_blank"}
              rel={link.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
              className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink hover:text-accent transition-colors"
            >
              <span className="text-slate group-hover:text-accent transition-colors">{link.icon}</span>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
