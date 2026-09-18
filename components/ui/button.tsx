import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// DESIGN-SYSTEM.md v3 §6. Pill buttons; hover = a small lift plus a soft,
// tinted shadow (the ember button glows). A trailing icon nudges forward on
// hover. Focus is a 2px ember outline with offset — visible on light and dark.
const buttonVariants = cva(
  "group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-sans text-sm font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:pointer-events-none disabled:opacity-50 motion-safe:hover:-translate-y-0.5 active:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg:last-child]:transition-transform motion-safe:hover:[&_svg:last-child]:translate-x-0.5",
  {
    variants: {
      variant: {
        default: "bg-ink text-paper shadow-soft hover:bg-ink/90 hover:shadow-lift",
        // The one "do this next" per view: ember fill, ink text (5.95:1).
        accent: "bg-ember font-semibold text-ink hover:shadow-glow-ember",
        outline: "border border-ink/15 bg-sheet text-ink shadow-soft hover:border-ink/30 hover:shadow-lift",
        // For dark surfaces.
        glass: "border border-white/15 bg-white/5 text-paper backdrop-blur-md hover:border-white/30 hover:bg-white/10",
        "outline-light": "border border-white/15 bg-white/5 text-paper backdrop-blur-md hover:border-white/30 hover:bg-white/10",
        destructive: "bg-critical text-paper hover:bg-critical/90",
        secondary: "bg-secondary text-ink hover:bg-secondary/80",
        ghost: "text-ink hover:bg-ink/5",
        link: "rounded-none text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink motion-safe:hover:translate-y-0",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-7 text-base",
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
