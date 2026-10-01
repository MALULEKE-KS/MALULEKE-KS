// components/shared/Accent.tsx
// Renders a headline from content with its accent words — written *like
// this* in the admin — set in Plex Serif italic (the "Plex, elevated" type
// system, owner's choice 2026-09-30). Plain text otherwise; never HTML.

import { Fragment } from "react";

export function Accent({ text, className = "type-accent" }: { text: string; className?: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\*[^*]+\*$/.test(part) ? (
          <em key={i} className={className}>
            {part.slice(1, -1)}
          </em>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** The same text with the accent markers removed — for titles, metadata and screen-reader-only copies. */
export function plainAccent(text: string) {
  return text.replace(/\*([^*]+)\*/g, "$1");
}
