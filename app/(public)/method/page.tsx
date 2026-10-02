// app/(public)/method/page.tsx
// /method — now a section of About (owner, 2026-10-02: fewer pages, each
// excellent). The principles and their evidence live at /about#method; old
// links and search results land there permanently.

import { permanentRedirect } from "next/navigation";

export default function MethodPage() {
  permanentRedirect("/about#method");
}
