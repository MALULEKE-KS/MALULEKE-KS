// components/shared/TextLink.tsx
// The ordinary in-content link. Deliberately not `.rule-citation` — that
// dashed-underline mono treatment marks an actual rule identifier (BR-1.1,
// EXT-1) and would stop meaning that if every link on the site used it
// (Design System §4.1: every visual device encodes real information).
// Sentence case, no appended arrow (§0), no brass (§4.2).

import Link from "next/link";
import { cn } from "@/lib/utils";

export function TextLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "font-sans text-sm text-ink underline underline-offset-4 decoration-slate/40 transition-colors hover:decoration-ink",
        className,
      )}
      {...props}
    />
  );
}
