Populated via the shadcn/ui CLI (`npx shadcn@latest add <component>`) during
the setup phase — never hand-edited except through that CLI, per
docs/PROJECT-STRUCTURE.md.

Exceptions are adapted from the official registries' own source and say so in
their header (what changed: design tokens, reduced motion, hydration safety).
`text-animate`, `shine-border` and `light-rays` (2026-10-03) were written
from the Magic UI registry's published source because the CLI couldn't reach
magicui.design from the build sandbox; each is recorded in
docs/PUBLIC-REDESIGN-PLAN.md §7a.
`orbiting-circles` (Magic UI) and `thinking-orb` (21st.dev's MorphOrb, the orb
only) followed on 2026-10-03, adapted the same way.
