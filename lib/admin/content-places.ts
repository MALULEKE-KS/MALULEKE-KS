// lib/admin/content-places.ts
// Where each page-content block appears (D-057): Admin → Page content groups
// its editors by these places, with a link to each page. Every block is in
// exactly one place (tests/unit/admin-content-places.test.ts), so a new block
// can't be left without an editor.

import type { ContentKey } from "@/lib/content/blocks";

export const CONTENT_PLACES: { id: string; label: string; path: string; keys: ContentKey[] }[] = [
  { id: "place-everywhere", label: "Every page", path: "/", keys: ["site-header", "page-copy", "release", "evidence"] },
  { id: "place-home", label: "Home", path: "/", keys: ["home-hero", "home-intro", "ai-guide"] },
  { id: "place-systems", label: "Systems", path: "/systems", keys: ["systems-page"] },
  { id: "place-journey", label: "Journey", path: "/journey", keys: ["journey"] },
  { id: "place-about", label: "About", path: "/about", keys: ["how-i-build"] },
  { id: "place-guide", label: "AI guide", path: "/", keys: ["guide-instant", "guide-fit", "guide-tours"] },
];
