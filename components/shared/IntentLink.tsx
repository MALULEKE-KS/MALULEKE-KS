// components/shared/IntentLink.tsx
// next/link that prefetches on intent, not on sight (D-063). Since the public pages
// are served from the cache (D-062), Next.js prefetches a static page in full the
// moment a link to it enters the screen — the header, the dock, every card — which
// added ~200 KB and a dozen requests to a phone's first load. Here a page is fetched
// when the visitor shows they may go there — the pointer arrives, the link takes
// focus, or a finger lands on it — still well before the click, so navigation stays
// instant. A link that sets `prefetch` itself keeps its own choice.

"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof NextLink>;

export default function IntentLink({ prefetch, onPointerEnter, onFocus, onTouchStart, ...props }: Props) {
  const router = useRouter();
  if (prefetch !== undefined && prefetch !== null) return <NextLink prefetch={prefetch} onPointerEnter={onPointerEnter} onFocus={onFocus} onTouchStart={onTouchStart} {...props} />;
  const href = typeof props.href === "string" ? props.href : null;
  const warm = () => {
    if (href && href.startsWith("/") && !href.startsWith("//")) router.prefetch(href);
  };
  return (
    <NextLink
      {...props}
      prefetch={false}
      onPointerEnter={(e) => {
        warm();
        onPointerEnter?.(e);
      }}
      onFocus={(e) => {
        warm();
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        warm();
        onTouchStart?.(e);
      }}
    />
  );
}
