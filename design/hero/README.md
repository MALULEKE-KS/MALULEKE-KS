# The home hero's cover images

Two images — one landscape for tablets and desktops, one portrait for phones — shown behind the whole home hero (`components/shared/HeroBackdrop.tsx`), served by the photo slots `hero-desktop` and `hero-mobile` (Admin → Photos). They reach the database through the data migration `prisma/migrations/20261020160000_home_hero_cover_images` and can be replaced in the admin at any time; the original files are never committed.

**They are AI-generated** — that provenance is kept here, in the repository. **No credit is shown on the site:** the owner decided on 2026-10-20 that the hero carries no credit line (the `home-hero` block's `imageCredit` stays empty; if he ever writes one, it appears).

| | |
|---|---|
| Generated | 2026-10-20, in the owner's ChatGPT account (Free plan), image mode, in Chrome — at the owner's direction: *"call out ChatGPT in Chrome and do a powerful prompt … generate both mobile and desktop"* |
| Why this subject | The owner's complaint about the first image (a city skyline) was that it was "not related to the system or software engineering". A data-centre aisle is the system itself; the thin orange light lines are the brand's one accent colour as a living flow of data |
| Terms | Output is the owner's to use under OpenAI's terms at the time of generation (from memory — re-read the current terms before relying on this commercially). No third party's work was copied in; no people, text or logos are in the images |
| Provenance of the files | `Futuristic Server Corridor Glow.png` (1536 × 1024, 2.2 MB) → desktop; `Futuristic Orange-Lit Server Corridor.png` (1024 × 1536, 1.9 MB) → phone; PNG, no metadata |

### The prompts (verbatim)

**Desktop** — *"Create a cinematic, photorealistic widescreen (landscape, 3:2) background image for the home page hero of a software engineer's personal platform. Subject: the inside of a pristine modern data centre - long aisles of dark graphite server racks receding in strong one-point perspective toward a vanishing point in the left third of the frame. Thin, glowing International Orange (#FF5B1F) fibre-optic light lines run along the cable trays and rack edges and converge toward the vanishing point like a living flow of data; a few tiny cool steel-blue status LEDs for contrast. Mood: calm, precise, trustworthy, engineered - the feel of a flagship product site (Linear, Vercel, Stripe), not sci-fi or cyberpunk. Palette: almost-black graphite (#0B0C0E to #1B1E23) covering about 85% of the frame, orange as the only accent; no purple, no neon pink or green. Light: soft volumetric haze, shallow depth of field with the far racks gently out of focus, fine film grain, low-key. Composition: keep the central 60% of the frame and the whole upper third dark, smooth and uncluttered so white headline text can sit on top with high contrast; put the visual interest toward the left, right and bottom edges. Strictly: no people, no text, no logos, no screens with readable content, no watermark, no illustration or 3D-render look - it must look like a real photograph shot on a full-frame camera with a 24mm lens."*

**Phone** (same chat, so the scene and style match) — *"Using exactly the same scene, lighting, colour palette and photographic style, create a vertical portrait version (2:3, to be cropped to 9:16) for phones: the aisle of dark graphite server racks with thin glowing International Orange fibre-optic light lines converging toward a vanishing point placed low and centred, in the lower third of the frame. Keep the whole upper 55% of the frame dark, smooth and uncluttered so white headline text can sit on top with high contrast. Strictly no people, no text, no logos, no watermark; it must look like a real photograph, not an illustration or a 3D render."*

### The encoded files

| File | Size | Encoded |
|---|---|---|
| `hero-desktop.webp` | 1536 × 1024 | WebP quality 74 — 92.8 KiB |
| `hero-mobile.webp` | 1024 × 1536 | WebP quality 72 — 71.2 KiB |

Encoded exactly as an admin upload is (`lib/profile/photos.ts`: oriented, resized to fit the edge, WebP, no metadata). Rebuild with:

```
node scripts/build-hero-photos.mjs --desktop <landscape.png> --mobile <portrait.png> \
  --migration <new-migration-folder> --alt "…"
```

The focal points (and a credit, only if the owner ever writes one) are the `home-hero` block's (Admin → Page content → Home — hero); the overlay's darkness is the setting `home.hero.scrim`. Weight budgets (100 KiB desktop, 80 KiB phone) are asserted in `tests/integration/home-hero.test.ts`.

*History:* the first cover image was a Johannesburg dusk photograph (Tania Melnyczuk, Unsplash). The owner rejected it on 2026-10-20 (not related to the system) and it was removed before it ever reached production.

### Phone image, second version (2026-10-20, Sprint 1b, D-040)

The first phone image was **black across its top half**: the prompt asked for "the whole upper 55% dark, smooth and uncluttered", so the scene existed only in the lower half, and the owner saw the picture "only in the lower part, not covering the whole hero, blurry". It was also encoded at quality 72 and shown at about twice its pixel size, hence the blur.

| | |
|---|---|
| Generated | 2026-10-20, ChatGPT (the owner's account, Free plan), image mode, in Chrome. The account then reported it was out of image creations until tomorrow |
| Source | `Futuristic Data Centre Server Corridor.png`, 1024 × 1536, 2.85 MB (downloaded from the owner's own generation; the original is not committed) |
| Encoded | WebP quality 78, effort 6, with a size-3 median denoise (generated film grain is what made the first encode 170+ KiB) — 1024 × 1536, 117.1 KiB; migration `20261020230000_home_hero_phone_image_full_frame` supersedes the slot's first version (BR-1.17: kept, never altered) |

**Prompt (verbatim, abridged only by the repeated palette sentence):** *"Create an image: a cinematic, photorealistic VERTICAL portrait photograph (2:3) to be used as a full-bleed phone background … the inside of a pristine modern data centre, looking down a long aisle of dark graphite server racks. IMPORTANT composition: the scene must fill the ENTIRE frame from the top edge to the bottom edge with no empty dark area anywhere. Tall server racks rise all the way to the top of the frame on both sides, with rack doors, perforated mesh, cable trays and ceiling light strips visible in the upper half as well as the lower half; the aisle recedes toward a vanishing point at the vertical centre of the frame. Thin, glowing International Orange (#FF5B1F) fibre-optic light lines run along the rack edges and cable trays the full height of the frame … Detail must be crisp and sharp everywhere, with texture visible even in the shadows … Strictly: no people, no text, no logos … a real photograph shot on a full-frame camera with a 24mm lens."*

Weight budget for the phone image is now 130 KiB (law in `tests/integration/home-hero.test.ts`); the home page's largest image is 125 KB in `perf-budgets.json`.

## The other pages' hero images (2026-10-21, Sprint 1c, D-041)

One landscape image per page, used for phones and desktops (slots `hero-systems`, `hero-journey`, `hero-about`, `hero-contact`; `PageHeroBackdrop`). Generated in the owner's second ChatGPT account (Free plan), image mode, in Chrome, each from one prompt; encoded 1280 px, WebP quality 72, size-3 median denoise (`scripts/build-hero-photos.mjs --slot … --replace`). Common to every prompt: a cinematic, photorealistic widescreen (landscape, 3:2) photograph; the scene fills the ENTIRE frame edge to edge with detail everywhere and no large empty dark area; the main interest centred so the image also crops to a wide strip or a square; the left third slightly calmer and darker; calm, precise, trustworthy, engineered (flagship product sites), not sci-fi or cyberpunk; graphite (#0B0C0E–#2A2E35) with International Orange (#FF5B1F) as the only accent; no people, no text, no logos, no watermark; a real photograph, not an illustration or a 3D render.

| Page | Source file (not committed) | Scene prompt (the part that differs) |
|---|---|---|
| Systems | `Futuristic Circuit Board Macro.png` 1536 × 1024, 2.5 MB | *The surface of a dark graphite printed circuit board and microchip seen from slightly above, thin glowing orange copper traces forming a dense, orderly, city-like grid of paths, junctions and small square nodes, a few tiny steel-blue status LEDs; shallow depth of field, macro lens* |
| Journey | `Neon Road to the Horizon.png` 1536 × 1024, 2.5 MB | *A long, empty, perfectly straight dark asphalt road across a vast dark graphite plain at pre-dawn, strong one-point perspective to a soft orange dawn glow on the horizon, thin glowing orange lines along both road edges, cloud layers and distant ridges; no vehicles or signs; 35mm lens* |
| About | `Midnight Workspace with City Lights.png` 1536 × 1024, 1.9 MB | *A quiet engineer's desk at night, low three-quarter angle, no person: dark desk, mechanical keyboard, monitor with only abstract soft light, open notebook, ceramic mug, a small warm orange desk lamp as the main light, out-of-focus orange and blue city bokeh; 35mm lens* |
| Let's talk | `Moody Corridor with Glowing Doorway.png` 1536 × 1024, 2.1 MB | *A door slightly ajar at the end of a dark graphite corridor, warm orange light spilling through the gap onto a polished floor, one-point perspective, an invitation* |

Terms and provenance as for the home hero images above (the owner's to use under OpenAI's terms at generation — re-read the current terms before relying on this commercially). Weights: about 100 KiB per page image at most.
