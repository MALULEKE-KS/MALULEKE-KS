// components/shared/IntentLink.tsx
// next/link that prefetches on intent, not on sight (D-063). Since the public pages
// are served from the cache (D-062), Next.js prefetches a static page in full the
// moment a link to it enters the screen — the header, the dock, every card — which
// added ~200 KB and a dozen requests to a phone's first load. Here prefetching
// starts when the visitor shows they may go there — the pointer arrives, the link
// takes focus, or a finger lands on it: the link switches its own prefetch on, and
// Next.js fetches the page at once (the link is on screen), still well before the
// click, so navigation stays instant. A link that sets `prefetch` keeps its choice.
// No router hook, so it renders anywhere a plain link can (tests included).

"use client";

import NextLink from "next/link";
import { useState, type ComponentProps } from "react";

type Props = ComponentProps<typeof NextLink>;

export default function IntentLink({ prefetch, onPointerEnter, onFocus, onTouchStart, ...props }: Props) {
  const [wanted, setWanted] = useState(false);
  if (prefetch !== undefined && prefetch !== null) return <NextLink prefetch={prefetch} onPointerEnter={onPointerEnter} onFocus={onFocus} onTouchStart={onTouchStart} {...props} />;
  return (
    <NextLink
      {...props}
      prefetch={wanted ? undefined : false}
      onPointerEnter={(e) => {
        setWanted(true);
        onPointerEnter?.(e);
      }}
      onFocus={(e) => {
        setWanted(true);
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        setWanted(true);
        onTouchStart?.(e);
      }}
    />
  );
}
