import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// DESIGN-SYSTEM.md v2 §6. Sharp corners; hover is the `print` lift — the
// button shifts up-left and a hard, unblurred shadow appears under it, like
// a misregistered print plate (§4.3). Focus is a 2px outline, never a glow.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none font-sans text-sm font-medium transition-[transform,box-shadow,background-color,color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary structure: blueprint.
        default:
          "bg-blueprint text-paper hover:shadow-[3px_3px_0_0_#F5B335] focus-visible:outline-accent",
        // Secondary signal: the one "do this next" per view.
        accent:
          "bg-amber text-ink hover:shadow-print-sm focus-visible:outline-ink",
        destructive: "bg-critical text-paper hover:shadow-print-sm focus-visible:outline-ink",
        outline:
          "border border-ink text-ink hover:bg-ink hover:text-paper hover:shadow-[3px_3px_0_0_#F5B335] focus-visible:outline-accent",
        // For blueprint bands.
        "outline-light":
          "border border-paper/70 text-paper hover:border-amber hover:text-amber hover:shadow-[3px_3px_0_0_#F5B335] focus-visible:outline-amber",
        secondary: "bg-slate text-paper hover:shadow-print-sm focus-visible:outline-accent",
        ghost: "text-ink hover:bg-ink/5 focus-visible:outline-accent",
        link: "text-ink underline underline-offset-4 decoration-slate/40 hover:decoration-ink hover:translate-x-0 hover:translate-y-0 focus-visible:outline-accent",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11",
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
