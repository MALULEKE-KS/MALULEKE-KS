-- D-065 (the owner's plan: "three flagship cards directly below the hero"; owner, 2026-10-24:
-- "those three flagships" — Xkimi Xa Mali, Sunduza, MALULEKE-KS). Xkimi and Sunduza are the
-- owner's hand-picked home cases, which win over the flagship fallback, so MALULEKE-KS joins
-- them as the third, after the ones already there. Only while it isn't featured; the owner's
-- choice in Admin -> Systems -> "Where it's shown" decides from here on. Additive only.

UPDATE "System"
SET "featuredOnHome" = true,
    "homeOrder" = COALESCE((SELECT MAX("homeOrder") FROM "System" WHERE "featuredOnHome" = true), 0) + 1
WHERE "slug" = 'maluleke-ks' AND "featuredOnHome" = false;
