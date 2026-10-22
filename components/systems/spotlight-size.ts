// components/systems/spotlight-size.ts
// The Systems spotlight's card size, in one place: the ring draws its cards at this
// width (SystemsSpotlight), and the page's placeholder reserves the same height
// while the ring streams in (HeroExtrasFallback), so the catalog never jumps.
// A plain module — a "use client" file's exports reach a server page only as
// references, never as values.

/** The front card's width: most of a phone, capped on a wide screen (D-046). */
export const SPOTLIGHT_CARD_WIDTH = "clamp(272px, 76vw, 540px)";
/** Width over height of a card. */
export const SPOTLIGHT_CARD_ASPECT = 16 / 10;
