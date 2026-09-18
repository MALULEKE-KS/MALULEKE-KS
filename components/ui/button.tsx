import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Restyled to DESIGN-SYSTEM.md rather than shadcn's defaults: flat (no
// shadows, §0), sharp corners (§3), sans sentence-case labels (§2), brass
// kept off buttons (§4.2 — accent is for flagship markers, active states and
// the numbers). Focus is an outline, not a ring: Tailwind rings render as
// box-shadow, which this system doesn't use.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none font-sans text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary action — one per view.
        default: "bg-ink text-paper hover:bg-ink/85",
        destructive: "bg-critical text-paper hover:bg-critical/90",
        // Secondary / utility action.
        outline: "border border-ink text-ink hover:bg-ink hover:text-paper",
        secondary: "bg-slate text-paper hover:bg-slate/90",
        ghost: "text-ink hover:bg-slate/10",
        link: "text-ink underline underline-offset-4 decoration-slate/40 hover:decoration-ink",
      },
      size: {
        default: "h-10 px-6",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
