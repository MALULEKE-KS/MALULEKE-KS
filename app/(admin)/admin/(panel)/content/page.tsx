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
import { JsonBlockEditor } from "./_components/JsonBlockEditor";

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
    { name: "checkNote", label: "What the chat says about its nightly self-check (all passed)", max: 200, kind: "line", hint: "Shown beside the box. Fill-ins: {date} {total} {passed}." },
    { name: "checkNoteFailed", label: "…and when some checks failed", max: 200, kind: "line", hint: "Fill-ins: {date} {total} {passed} {failed}." },
    { name: "feedbackHelpful", label: "Button: the answer was helpful", max: 40, kind: "line", hint: "Empty hides the feedback buttons." },
    { name: "feedbackWrong", label: "Button: the answer was wrong", max: 40, kind: "line" },
    { name: "feedbackThanks", label: "After feedback is sent", max: 80, kind: "line" },
    { name: "challengeLabel", label: "Button: challenge an answer", max: 40, kind: "line", hint: "Empty hides it." },
    { name: "challengePrompt", label: "What the challenge button asks the guide", max: 300, kind: "line" },
    { name: "privacyNote", label: "What the chat says it keeps", max: 200, kind: "line", hint: "Shown beside the box. {retentionDays} is filled in from concierge.logRetentionDays; nothing is shown (and no question text is kept) when that is 0." },
    {
      name: "pageSuggestions",
      label: "Questions per page",
      kind: "json",
      hint: 'The chat opens with these on a page, before the example questions. A list of { "page": "/systems/", "questions": ["…"] } — a page ending in "/" covers everything under it; up to 3 questions each.',
    },
  ],
  "guide-instant": [
    { name: "contact", label: "How to contact you (no email shown)", max: 500, kind: "text", hint: "Fill-ins: {owner} {reviewSlaHours}" },
    { name: "contactEmail", label: "How to contact you (with your public email)", max: 500, kind: "text", hint: "Fill-ins: {owner} {reviewSlaHours} {email} — used when an email is published" },
    { name: "cv", label: "Where the CV is", max: 400, kind: "text", hint: "Fill-ins: {owner} {cvOptions}" },
    { name: "cvNone", label: "When no CV is published", max: 400, kind: "text", hint: "Fill-in: {owner}" },
    { name: "counts", label: "How many systems", max: 500, kind: "text", hint: "Fill-ins: {owner} {systems} {breakdown} {privateNote}" },
    { name: "pulse", label: "The platform's live numbers", max: 500, kind: "text", hint: "Fill-ins: {owner} {rules} {audited7} {auditedTotal}" },
    { name: "privateOne", label: "Note when one system keeps its code private", max: 200, kind: "line", hint: "Fill-ins: {owner} {privateCount}. Used inside the 'how many systems' reply as {privateNote}." },
    { name: "privateMany", label: "Note when several systems keep their code private", max: 200, kind: "line", hint: "Fill-ins: {owner} {privateCount}" },
  ],
  "guide-fit": [
    { name: "yearsNote", label: "When a need asks for more years than you have been building", max: 200, kind: "line", hint: "Fill-ins: {years} {since}. Empty = say nothing." },
    { name: "seniorityNote", label: "When a need asks for seniority or leadership", max: 200, kind: "line" },
    { name: "noneNote", label: "When the site shows nothing yet", max: 200, kind: "line" },
  ],
  release: [
    { name: "current", label: "Version the site is on", max: 20, kind: "line", hint: "e.g. V1" },
    { name: "next", label: "Next version", max: 20, kind: "line", hint: "e.g. V2 — leave empty when nothing's planned" },
    { name: "nextNote", label: "About the next version", max: 60, kind: "line", hint: "e.g. on the way" },
    { name: "link", label: "Where it links", max: 120, kind: "line", hint: "A site path, e.g. /systems/maluleke-ks — or empty" },
  ],
};

export default async function AdminContentPage() {
  const rows = await db.siteContent.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const howIBuild = byKey.get("how-i-build");
  const parsed = CONTENT_BLOCKS["how-i-build"].schema.safeParse(howIBuild?.body);
  const evidence = byKey.get("evidence");
  const journey = byKey.get("journey");
  const tours = byKey.get("guide-tours");

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
                initial={body.success ? (body.data as Record<string, unknown>) : null}
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
          <JsonBlockEditor
            blockKey="evidence"
            key={evidence?.updatedAt.toISOString() ?? "new"}
            initial={evidence?.body ?? null}
            hint="Each claim: id, claim, where (principle:<name>, pulse:<key> or system:<slug>), status (verified, partial, planned), proves, doesNotProve, 1–6 evidence links, reviewedAt (YYYY-MM-DD). Links: repo:<path>, /public-route or actions:<workflow>.yml. A verified claim shows “Review due” on its own once its review is older than the evidence.reviewDays setting."
          />
        </Panel>
        <Panel title={CONTENT_BLOCKS["guide-tours"].title} description={`${CONTENT_BLOCKS["guide-tours"].description} Last changed ${formatWhen(tours?.updatedAt)}.`}>
          <JsonBlockEditor
            blockKey="guide-tours"
            key={tours?.updatedAt.toISOString() ?? "new"}
            initial={tours?.body ?? null}
            hint="spotlightSeconds (1–15), tours: key (letters, digits, dashes), label, summary, stops (1–10): path (a site path, e.g. /systems), section (optional — a heading on that page, e.g. skills), say (one line, ≤220). Stops on pages the site doesn't have are skipped."
          />
        </Panel>
        <Panel title={CONTENT_BLOCKS.journey.title} description={`${CONTENT_BLOCKS.journey.description} Last changed ${formatWhen(journey?.updatedAt)}.`}>
          <JsonBlockEditor
            blockKey="journey"
            key={journey?.updatedAt.toISOString() ?? "new"}
            initial={journey?.body ?? null}
            hint="headline (≤160, *word* for the accent), lede, chapters: id, from (year), to (year or null for ongoing), title, place (optional), body (≤1200) — then ahead: title, body. Drafted from your CV and your answers: read it, change anything, then set reviewed to true."
          />
        </Panel>
      </div>
    </>
  );
}
