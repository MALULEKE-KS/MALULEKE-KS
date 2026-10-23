// components/shared/Container.tsx
// The one page frame (Design System §3 — left-aligned, drafting-table
// reading order). Header, page body and footer all use this, so every public
// route shares the same left edge. Pages must not set their own
// `max-w-* mx-auto` container; constrain reading width on the inner content
// instead and leave it left-aligned.
//
// `w-full` is load-bearing: this can sit inside a flex column, where
// `mx-auto` alone turns off stretch and the box shrinks to its content.
// The side padding never goes under a phone's notch in landscape: the page runs
// edge to edge (viewport-fit=cover, D-048), so it is at least the safe area.

import { cn } from "@/lib/utils";

export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl pr-[max(1.5rem,env(safe-area-inset-right))] pl-[max(1.5rem,env(safe-area-inset-left))]", className)} {...props} />;
}
