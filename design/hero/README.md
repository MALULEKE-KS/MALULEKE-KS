# The home hero's photograph

Two crops of one photograph, as served by the photo slots `hero-desktop` and `hero-mobile` (Admin → Photos). They reach the database through the data migration `prisma/migrations/20261020140000_home_hero_photos` and can be replaced in the admin at any time; the originals are never committed.

| | |
|---|---|
| Photograph | *City skyline during night time* — dusk over Braamfontein, Johannesburg, seen from the 24th floor of a hotel |
| Photographer | Tania Melnyczuk (@alphabetania) |
| Source | https://unsplash.com/photos/city-skyline-during-night-time-diwubNzqQW0 — published 6 February 2020 |
| Licence | Unsplash License ("free to use", read on the photo's page on 2026-10-20). It is not public domain: do not resell the photograph unaltered or compile it into a competing library |
| Retrieved | 2026-10-20, *Original Size* (4032 × 2268, 1.23 MB), downloaded with the owner's approval, kept outside the repository |
| Chosen by | The owner delegated the search (2026-10-20); selection criteria in `docs/improvements/HOME-HERO-PLAN.md` §7 |

| File | Crop | Size | Encoded |
|---|---|---|---|
| `hero-desktop.webp` | 21:9 band, 4032 × 1728 from y = 330 | 2560 × 1097 | WebP quality 62 — about 88 KB |
| `hero-mobile.webp` | 4:5 portrait, 1814 × 2268 from x = 640 | 1169 × 1462 | WebP quality 58 — about 57 KB |

Graded lightly (saturation × 0.9, brightness × 0.94) so the vivid phone-camera sky sits calmly on graphite; oriented, resized to fit and encoded exactly as an admin upload is (`lib/profile/photos.ts`), no metadata. Rebuild with:

```
node scripts/build-hero-photos.mjs <original.jpg> --migration <new-migration-folder> \
  --credit "Photo: Tania Melnyczuk · Unsplash" --credit-url https://unsplash.com/photos/city-skyline-during-night-time-diwubNzqQW0 \
  --alt "…"
```

The credit shown on the image and the focal points are the `home-hero` content block's (Admin → Page content → Home — hero). Weight budgets (≤ 90 KiB desktop, ≤ 60 KiB phone) are asserted in `tests/integration/home-hero.test.ts`.
