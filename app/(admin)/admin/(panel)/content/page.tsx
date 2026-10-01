// app/(admin)/admin/(panel)/content/page.tsx
// Page content blocks (#106): site copy that used to live in code, edited
// here. Each block's body is validated against its schema on save
// (lib/content/blocks.ts); the public pages read it through PublicSiteContent.

import { PenLine } from "lucide-react";
import { AdminPageHeader, formatWhen, Panel } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { CONTENT_BLOCKS, type ContentKey } from "@/lib/content/blocks";
import { HowIBuildEditor } from "./_components/HowIBuildEditor";
import { FieldsBlockEditor, type BlockField } from "./_components/FieldsBlockEditor";
import { EvidenceEditor } from "./_components/EvidenceEditor";

export const dynamic = "force-dynamic";

// The simple blocks' fields — limits match their schemas in lib/content/blocks.ts.
const FIELDS: Partial<Record<ContentKey, BlockField[]>> = {
  "home-intro": [
    { name: "headline", label: "Headline", max: 160, kind: "line" },
    { name: "lede", label: "Introduction", max: 600, kind: "text" },
  ],
  "systems-page": [
    { name: "heading", label: "Heading", max: 140, kind: "line" },
    { name: "lede", label: "Introduction", max: 400, kind: "text" },
  ],
  "ai-guide": [
    { name: "eyebrow", label: "Label", max: 60, kind: "line" },
    { name: "heading", label: "Heading", max: 120, kind: "line" },
    { name: "lede", label: "Introduction", max: 500, kind: "text" },
    { name: "suggestions", label: "Example questions", max: 140, kind: "list", maxItems: 6 },
  ],
};

export default async function AdminContentPage() {
  const rows = await db.siteContent.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const howIBuild = byKey.get("how-i-build");
  const parsed = CONTENT_BLOCKS["how-i-build"].schema.safeParse(howIBuild?.body);
  const evidence = byKey.get("evidence");

  return (
    <>
      <AdminPageHeader icon={PenLine} title="Page content" description="Words on the site that aren't tied to a system, a role or the profile." />
      <div className="space-y-6">
        {(Object.keys(FIELDS) as ContentKey[]).map((key) => {
          const row = byKey.get(key);
          const body = CONTENT_BLOCKS[key].schema.safeParse(row?.body);
          return (
            <Panel key={key} title={CONTENT_BLOCKS[key].title} description={`${CONTENT_BLOCKS[key].description} Last changed ${formatWhen(row?.updatedAt)}.`}>
              <FieldsBlockEditor
                key={row?.updatedAt.toISOString() ?? "new"}
                blockKey={key}
                fields={FIELDS[key]!}
                initial={body.success ? (body.data as Record<string, string | string[]>) : null}
              />
            </Panel>
          );
        })}
        <Panel
          title={CONTENT_BLOCKS["how-i-build"].title}
          description={`${CONTENT_BLOCKS["how-i-build"].description} Last changed ${formatWhen(howIBuild?.updatedAt)}.`}
        >
          <HowIBuildEditor key={howIBuild?.updatedAt.toISOString() ?? "new"} initial={parsed.success ? parsed.data : null} />
        </Panel>
        <Panel title={CONTENT_BLOCKS.evidence.title} description={`${CONTENT_BLOCKS.evidence.description} Last changed ${formatWhen(evidence?.updatedAt)}.`}>
          <EvidenceEditor key={evidence?.updatedAt.toISOString() ?? "new"} initial={evidence?.body ?? null} />
        </Panel>
      </div>
    </>
  );
}
