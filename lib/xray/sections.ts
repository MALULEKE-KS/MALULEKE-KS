// lib/xray/sections.ts
// The sections the X-ray labels on each page it covers (D-067, "See how this page works"):
// each one's key — the page marks the section with data-xray="<key>" — and the component
// that draws it, linked on GitHub at the running build. Which capabilities a section
// shows is not listed here: it is the capability map's own `frontend[].xray`
// (lib/capabilities/map.ts), so the labels and the map can't disagree. The words for
// each section are the owner's ("page-xray" block, sectionLabels).

export interface XraySection {
  key: string;
  /** The component that draws the section, from the repository root. */
  source: string;
}

export const XRAY_PAGES: Record<string, XraySection[]> = {
  "/": [
    { key: "hero", source: "components/home/HomeHeroV2.tsx" },
    { key: "work", source: "components/home/WorkShowcase.tsx" },
    { key: "guide", source: "components/home/AiGuideSection.tsx" },
    { key: "principles", source: "components/home/PrinciplesBand.tsx" },
    { key: "map", source: "components/home/SystemMap.tsx" },
    { key: "contact", source: "components/home/ContactBand.tsx" },
  ],
};
