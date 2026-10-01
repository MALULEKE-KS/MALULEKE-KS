# The K-S mark — Stencil, Graphite

Owner-approved on 2026-10-01 (direction 05 of five, round two). Rules for use: `docs/DESIGN-SYSTEM.md` §6c.

| File | What it is |
|---|---|
| `ks-stencil-3d.html` | The interactive 3D piece and the construction drawing — open it in a browser. One geometry drives the flat mark and the 3D piece. `#bg=rrggbb` in the address sets the ground (used to render stills). |
| `ks-3d-graphite.png` | The 3D piece, Graphite finish, transparent — matted from renders on black and on white (exact alpha, soft edges). Web copy: `public/brand/ks-3d-graphite.webp` (the 404 page). |
| `ks-3d-graphite-og.png` | The 3D piece at share-image size, read by `lib/og.tsx` (bundled with the share-image functions via `next.config.ts`). |
| `ks-icon-512.png` | The browser-tab icon (`app/icon.svg`) at 512 px. |

## The geometry (64-unit grid, y down)

- Letters 34 units tall, from y 15 to y 49; centre line y 32.
- **K:** stem 6.6 wide at x 6; arms start one **stencil gap** (2.6; heavy cut 3.4) after the stem; arm and leg are parallelograms meeting the centre line at y 30.3 / 33.7.
- **Block:** 5.2 square (heavy cut 6.4), centred at (35, 32), International Orange `#FF5B1F`.
- **S:** two ring sectors centred at (50.4, 25.1) and (50.4, 38.9), outer radius 10.1, inner 3.7; the top bowl runs from −40° round to the spine, the bottom from the spine to 140°, each stopping 8° short of the spine (heavy cut 13°) — the stencil bridge.

The path data in `components/shared/BrandMark.tsx`, `app/icon.svg` and `lib/og.tsx` was generated from these numbers with true arcs. To change the mark, change the numbers here and in `ks-stencil-3d.html`, regenerate the paths, and update all three.
