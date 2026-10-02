// app/(public)/cv/page.tsx
// /cv — no longer a page (owner, 2026-10-02: "even a CV didn't need its own
// page"). The CV is the owner's own uploaded file, offered wherever it's
// useful (header, phone menu, home hero, About) while he has it switched on.
// Old links keep working: /cv downloads that file, or — when it's off — lands
// on About. The generated-CV page is kept dormant beside this file
// (_generated-cv-page.tsx), not routed, as the owner chose.

import { redirect } from "next/navigation";
import { getUploadedCvLink } from "@/lib/cv/options";

export const dynamic = "force-dynamic";

export default async function CvPage() {
  const cv = await getUploadedCvLink();
  redirect(cv?.url ?? "/about");
}
