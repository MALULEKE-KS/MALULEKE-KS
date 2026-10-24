// app/(admin)/admin/(panel)/content/page.tsx
// Page content blocks (#106): site copy that used to live in code, edited
// here. Each block's body is validated against its schema on save
// (lib/content/blocks.ts); the public pages read it through PublicSiteContent.
// Since the admin pass (D-057) the blocks are grouped by where they appear,
// with an index that sticks under the page bar and a link to each page — and
// every block has an editor (the section copy had none).

import { ArrowUpRight, PenLine } from "lucide-react";
import { AdminPageHeader, formatWhen, Panel } from "@/components/admin/ui";
import { SectionIndex } from "@/components/admin/SectionIndex";
import { CONTENT_PLACES as PLACES } from "@/lib/admin/content-places";
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
  "home-hero": [
    { name: "statement", label: "Statement under your name and role", max: 200, kind: "text", hint: "One plain sentence. Your name and role come from your profile; the numbers under it are computed." },
    { name: "primaryLabel", label: "Main button", max: 40, kind: "line", hint: "Empty = the shipped wording." },
    { name: "liveLabel", label: "The live line", max: 60, kind: "line", hint: "Fill-ins: {date} — today's date; {commit} — the build that is running. Empty = the shipped wording." },
    { name: "previewLabel", label: "The line on a preview deployment (not the live site)", max: 60, kind: "line", hint: "Fill-in: {commit}. Shown instead of the live line when the page is a preview build." },
    { name: "localLabel", label: "The live line on a local build", max: 60, kind: "line" },
    { name: "buildingSlug", label: "The system you are building now", max: 120, kind: "line", hint: "Only you can say what you are building. Write the address name of one of your published systems (the part after /systems/, e.g. fundslink-academy). Empty = the line shows the repository with your latest commit instead." },
    { name: "buildingLabel", label: "The line before it, when you have named one", max: 40, kind: "line" },
    { name: "nowLabel", label: "The line before the latest commit, when you have not named one", max: 40, kind: "line", hint: "Shown for the repository with your latest real commit in the last 30 days." },
    { name: "stackLabel", label: "The line above the technologies you build with", max: 60, kind: "line", hint: "How many are shown: Settings → home.hero.stackCount. They are ranked by how many of your systems use each." },
    { name: "ledgerAria", label: "Screen-reader name of the record", max: 60, kind: "line" },
    {
      name: "ledgerLabels",
      label: "The record's labels",
      kind: "json",
      hint: 'For shipped, rules, audited and systems: { "shipped": { "one": "system shipped to production", "many": "systems shipped to production", "claim": "Runs in production" }, … } — "one" is used when the figure is 1; "claim" is the phrase set above the figure, so the record reads as the proof of your statement (leave it out for a supporting figure); a label left out keeps the shipped wording.',
    },
    { name: "imageCredit", label: "Hero photo credit (shown on the image)", max: 120, kind: "line", hint: 'For example "Photo: Name · Unsplash". Empty = no credit shown.' },
    { name: "imageCreditUrl", label: "Hero photo credit link", max: 300, kind: "line", hint: "https:// address of the photo's page." },
    { name: "imagePositionDesktop", label: "Desktop crop — focal point", max: 12, kind: "line", hint: 'Where the subject sits, like "50% 60%" (left-to-right, top-to-bottom).' },
    { name: "imagePositionMobile", label: "Phone crop — focal point", max: 12, kind: "line", hint: 'Like "50% 50%".' },
  ],
  "site-header": [
    { name: "contactLabel", label: "The contact button", max: 40, kind: "line", hint: "The one contact entry in the header. Empty hides it." },
    { name: "cvLabel", label: "The CV button", max: 24, kind: "line", hint: "Shown only while a CV is switched on. Empty hides it." },
    { name: "homeLabel", label: "The home link's name (for screen readers)", max: 60, kind: "line", hint: "The logo has no words; this names it. Empty uses your name." },
    { name: "skipLabel", label: "The skip link (for keyboard users)", max: 40, kind: "line", hint: "Empty hides the skip link — keep it written." },
    { name: "menuLabel", label: "Phone: the menu button (the dock's last cell)", max: 24, kind: "line", hint: "Empty hides the menu button — keep it written." },
    { name: "menuCloseLabel", label: "Phone: the close button (for screen readers)", max: 40, kind: "line" },
    { name: "cvMenuLabel", label: "Phone: the CV button in the menu", max: 40, kind: "line" },
    { name: "reviewPromise", label: "Phone: the line about how fast you reply", max: 100, kind: "line", hint: "Fill-in: {hours} — your review window (a setting). Empty hides it." },
    { name: "pageHints", label: "Phone: one line under each page", kind: "json", hint: 'A path and its line: { "/systems": "Everything built, straight from GitHub", … }. A page without a line shows none.' },
    { name: "systemsPreviewLabel", label: "The Systems preview's name (for screen readers)", max: 60, kind: "line" },
    { name: "systemsAllLabel", label: "The link under the Systems preview", max: 60, kind: "line", hint: "Fill-in: {count} — how many systems are published. Empty hides the link. How many systems the preview shows: Settings → header.systemsPreview.count." },
    { name: "askLabel", label: "Phone: the AI guide in the bottom dock", max: 16, kind: "line", hint: "One short word under the guide's mark, in the middle of the phone's dock. Empty puts Let's talk there instead." },
    { name: "askHint", label: "Phone: the guide's full name (for screen readers)", max: 60, kind: "line", hint: "Say it's the AI guide, e.g. \"Ask the AI guide\"." },
    { name: "dockLabel", label: "Phone: the dock's name (for screen readers)", max: 40, kind: "line" },
    { name: "liveLabel", label: "The live chip beside the logo", max: 16, kind: "line", hint: "Shown on the live site, with the build that is running. Empty hides the chip." },
    { name: "previewLabel", label: "The chip on a preview build", max: 16, kind: "line" },
    { name: "vitalsTitle", label: "The chip's card: its heading", max: 60, kind: "line" },
    { name: "vitalsBuild", label: "The card: the build line", max: 40, kind: "line", hint: "Each line of the card is hidden when left empty." },
    { name: "vitalsSync", label: "The card: the GitHub sync line", max: 40, kind: "line" },
    { name: "vitalsRules", label: "The card: the rules line", max: 40, kind: "line" },
    { name: "vitalsAudited", label: "The card: the audited changes line", max: 40, kind: "line" },
    { name: "vitalsLink", label: "The card: its link", max: 40, kind: "line", hint: "Goes where Release → \"Where it links\" points. Empty hides it." },
  ],
  "home-orbit": [
    { name: "ariaLabel", label: "What a screen reader hears", max: 240, kind: "text", hint: "Fill-ins: {systems}, {homes}, {commits}." },
    { name: "statsLine", label: "The count under the orbit", max: 120, kind: "line", hint: "Fill-ins: {systems}, {homes}, {commits} (in 26 weeks)." },
    { name: "hint", label: "How to use it (desktop)", max: 80, kind: "line" },
    { name: "legendFlagship", label: "Legend: flagship", max: 30, kind: "line" },
    { name: "legendSystem", label: "Legend: system", max: 30, kind: "line" },
    { name: "legendActive", label: "Legend: active lately", max: 40, kind: "line" },
    { name: "legendSpark", label: "Legend: a spark", max: 40, kind: "line" },
    { name: "ignitingLine", label: "Timeline: while it starts", max: 40, kind: "line" },
    { name: "weekLine", label: "Timeline: the week being replayed", max: 80, kind: "line", hint: "Fill-ins: {week}, {commits}." },
    { name: "busiestLine", label: "Timeline: a system's busiest week", max: 120, kind: "line", hint: "Shown as the replay passes it. Fill-ins: {week}, {system}, {commits}." },
    { name: "restLine", label: "Timeline: after the replay", max: 80, kind: "line" },
    { name: "replayLabel", label: "The replay button", max: 40, kind: "line" },
    { name: "weekButton", label: "Each week's bar, for a screen reader", max: 80, kind: "line", hint: "Fill-ins: {week}, {commits}." },
    { name: "nowLabel", label: "The timeline's last week", max: 20, kind: "line" },
    { name: "flagshipLabel", label: "Panel: the flagship tag", max: 24, kind: "line" },
    { name: "activeNote", label: "Panel: committed to lately", max: 60, kind: "line" },
    { name: "commitsLabel", label: "Panel: under the commit count", max: 40, kind: "line" },
    { name: "openLabel", label: "Panel: the case-study button", max: 40, kind: "line" },
    { name: "prevLabel", label: "Panel: previous", max: 20, kind: "line" },
    { name: "nextLabel", label: "Panel: next", max: 20, kind: "line" },
    { name: "closeLabel", label: "Panel: close", max: 20, kind: "line" },
    { name: "exploreLabel", label: "Phone: the explore button", max: 50, kind: "line" },
    { name: "exploreHint", label: "Phone: under the explore button", max: 80, kind: "line" },
    { name: "phoneEyebrow", label: "Phone: above the orbit", max: 30, kind: "line" },
    { name: "phoneHint", label: "Phone: how to use it", max: 30, kind: "line" },
    { name: "factBusiest", label: "Panel: busiest week (heading)", max: 30, kind: "line" },
    { name: "busiestValue", label: "Panel: busiest week (value)", max: 60, kind: "line", hint: "Fill-ins: {week}, {commits}." },
    { name: "factQuiet", label: "Panel: a system with no commits in the 26 weeks", max: 60, kind: "line" },
    { name: "factShare", label: "Panel: share of the commits (heading)", max: 30, kind: "line" },
    { name: "shareValue", label: "Panel: share of the commits (value)", max: 60, kind: "line", hint: "Fill-ins: {percent}, {total}." },
    { name: "factLinked", label: "Panel: systems sharing its stack (heading)", max: 30, kind: "line" },
    { name: "touchHint", label: "Phone: how to play with it (over the orbit)", max: 90, kind: "line" },
    { name: "pointerHint", label: "Desktop: how to play with it (shown over the orbit until it's used)", max: 90, kind: "line" },
    { name: "enterLabel", label: "Panel: go inside the world", max: 30, kind: "line" },
    { name: "backLabel", label: "Inside a world: back to the orbit", max: 30, kind: "line" },
    { name: "insideLine", label: "Inside a world: what you're looking at", max: 200, kind: "text", hint: "Fill-in: {commits} — its commits over the 26 weeks." },
    { name: "coreLabel", label: "The core's name", max: 30, kind: "line", hint: "It opens your GitHub. Empty hides the label." },
    { name: "coreSub", label: "Under the core's name", max: 60, kind: "line" },
  ],
  "page-xray": [
    { name: "receiptLabel", label: "The receipt's name", max: 24, kind: "line", hint: "First word of the strip. Empty hides the receipt." },
    { name: "renderedLabel", label: "When this copy was rendered", max: 60, kind: "line", hint: "Fill-in: {time} — when the cached copy was made, in the site's time zone." },
    { name: "firstByteLabel", label: "How fast its first byte came", max: 60, kind: "line", hint: "Fill-in: {seconds} — measured in the visitor's own browser." },
    { name: "edgeLabel", label: "Where it was served from", max: 60, kind: "line", hint: "Fill-in: {region} — Vercel's edge that answered, like Cape Town (cpt1)." },
    { name: "cacheLabel", label: "The edge cache", max: 40, kind: "line", hint: "Fill-in: {cache} — HIT, STALE, MISS …, as the edge reports it." },
    { name: "buildLabel", label: "The build", max: 40, kind: "line", hint: "Fill-in: {commit} — links to that commit on GitHub." },
    { name: "rulesLabel", label: "The rules the database holds", max: 60, kind: "line", hint: "Fill-in: {count}." },
    { name: "switchLabel", label: "The X-ray switch", max: 40, kind: "line", hint: "Empty hides the X-ray." },
    { name: "onLabel", label: "The notice while it's on", max: 40, kind: "line" },
    { name: "offLabel", label: "Its turn-off button", max: 24, kind: "line" },
    { name: "intro", label: "One line under each section's name", max: 240, kind: "text" },
    { name: "showsLabel", label: "Heading: what it puts here", max: 40, kind: "line" },
    { name: "readsLabel", label: "Heading: what it reads", max: 40, kind: "line" },
    { name: "servedLabel", label: "Heading: the endpoints", max: 40, kind: "line" },
    { name: "rulesHeading", label: "Heading: the rules", max: 40, kind: "line" },
    { name: "sourceLabel", label: "Heading: the source", max: 40, kind: "line" },
    { name: "statusLabels", label: "Each rule status in words", kind: "json", hint: '{ "enforced": "Enforced", "partial": "One layer so far", "missing": "Not enforced yet", "building": "Being built", "deferred": "Deferred" }' },
    { name: "sectionLabels", label: "Each section's name", kind: "json", hint: '{ "hero": "The hero", "work": "Selected work", "guide": "The AI guide", "principles": "How I build", "map": "How it all connects", "contact": "Let\'s talk" }' },
  ],
  "flagship-outcomes": [
    {
      name: "outcomes",
      label: "One line per flagship",
      kind: "json",
      hint: 'The system\'s address and its line: { "xkimi-xa-mali": "Turned a family savings group\'s contributions into a ledger every member can trust…", … }. What it achieved, in one sentence; a flagship without a line shows its summary.',
    },
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
    { name: "tryLabel", label: "The line above the example questions", max: 40, kind: "line", hint: "Empty shows none." },
    { name: "knowsLine", label: "What the guide reads right now (under its name)", max: 120, kind: "line", hint: "Fill-ins: {systems} — published systems; {synced} — when GitHub was last synced. Parts separated by \" · \"; a part whose figure is missing is left out. Empty shows none." },
    { name: "shortcutLabel", label: "Beside the / key on a desktop", max: 40, kind: "line", hint: "Pressing / puts the cursor in the box. Empty hides the hint." },
    {
      name: "points",
      label: "What makes the answers worth trusting (beside the guide)",
      kind: "json",
      hint: 'Up to three, shown with their icons in this order — where answers come from, that they show their sources, that the guide never acts for you: [{ "title": "…", "text": "…" }]. Say only what the guide really does.',
    },
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

// The nested blocks, edited as JSON against the same schema the server checks.
const JSON_HINTS: Partial<Record<ContentKey, string>> = {
  evidence:
    "Each claim: id, claim, where (principle:<name>, pulse:<key> or system:<slug>), status (verified, partial, planned), proves, doesNotProve, 1–6 evidence links, reviewedAt (YYYY-MM-DD). Links: repo:<path>, /public-route or actions:<workflow>.yml. A verified claim shows “Review due” on its own once its review is older than the evidence.reviewDays setting.",
  "guide-tours":
    "spotlightSeconds (1–15), tours: key (letters, digits, dashes), label, summary, stops (1–10): path (a site path, e.g. /systems), section (optional — a heading on that page, e.g. skills), say (one line, ≤220). Stops on pages the site doesn't have are skipped.",
  journey:
    "headline (≤160, *word* for the accent), lede, chapters: id, from (year), to (year or null for ongoing), title, place (optional), body (≤1200) — then ahead: title, body. Drafted from your CV and your answers: read it, change anything, then set reviewed to true.",
  "page-copy":
    "One entry per section, keyed page.section (home.map, about.skills, contact.steps…): eyebrow (≤60), title (≤160, *word* for the accent), description (≤400), items (up to 8: title, body). Fill-ins: {reviewSlaHours}, {owner}. A section without an entry keeps its shipped words.",
};

export default async function AdminContentPage() {
  const rows = await db.siteContent.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const howIBuild = byKey.get("how-i-build");
  const parsed = CONTENT_BLOCKS["how-i-build"].schema.safeParse(howIBuild?.body);

  const editor = (key: ContentKey) => {
    const row = byKey.get(key);
    if (key === "how-i-build") return <HowIBuildEditor key={howIBuild?.updatedAt.toISOString() ?? "new"} initial={parsed.success ? parsed.data : null} />;
    if (FIELDS[key]) {
      const body = CONTENT_BLOCKS[key].schema.safeParse(row?.body);
      return <FieldsBlockEditor key={row?.updatedAt.toISOString() ?? "new"} blockKey={key} fields={FIELDS[key]!} initial={body.success ? (body.data as Record<string, unknown>) : null} />;
    }
    if (key === "evidence" || key === "journey" || key === "page-copy" || key === "guide-tours") {
      return <JsonBlockEditor blockKey={key} key={row?.updatedAt.toISOString() ?? "new"} initial={row?.body ?? null} hint={JSON_HINTS[key]} />;
    }
    return null;
  };

  return (
    <>
      <AdminPageHeader icon={PenLine} title="Page content" description="Words on the site that aren't tied to a system, a role or the profile — grouped by the page they appear on." />
      <SectionIndex sections={PLACES.map((p) => ({ id: p.id, label: p.label }))} label="Pages" />
      <div className="space-y-12">
        {PLACES.map((place) => (
          <section key={place.id} id={place.id} aria-labelledby={`${place.id}-title`} className="scroll-mt-32 space-y-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id={`${place.id}-title`} className="text-ink text-xl font-semibold tracking-tight">
                {place.label}
              </h2>
              <a href={place.path} className="text-slate hover:text-ink inline-flex items-center gap-1 text-sm font-medium">
                Open the page <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            </div>
            {place.keys.map((key) => (
              <Panel key={key} id={`block-${key}`} title={CONTENT_BLOCKS[key].title} description={`${CONTENT_BLOCKS[key].description} Last changed ${formatWhen(byKey.get(key)?.updatedAt)}.`}>
                {editor(key)}
              </Panel>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
