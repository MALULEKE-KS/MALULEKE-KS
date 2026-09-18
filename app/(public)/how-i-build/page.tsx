// app/(public)/how-i-build/page.tsx
// /how-i-build — mission statement, governing principles in plain language,
// real RuleCitation components (e.g. BR-1.1, BR-4.1). Admin-editable as a
// single content block, not a full CMS entity — this page is genuinely
// static content (docs/PAGE-SPECIFICATIONS.md's own explicit call), not a
// gap waiting on a database model.
// See docs/PAGE-SPECIFICATIONS.md ("/how-i-build"), docs/PLATFORM-CONSTITUTION-v1.md §1.

import { RuleCitation } from "@/components/shared/RuleCitation";

const PRINCIPLES = [
  {
    name: "Extension Over Modification (EXT-1)",
    body: "Anything expected to grow — a new project category, a new type of visitor, a new skill — lives in a lookup table or config, never a hard-coded list. A new chapter of the work shouldn't require rebuilding the platform to fit it.",
  },
  {
    name: "Smart Not Hard",
    body: "Buy the commodity, build the differentiated. Off-the-shelf tools handle what's already a solved problem; real engineering time goes into the parts that actually need building.",
  },
  {
    name: "Controlled Imperfection Engineering",
    body: "Failures are made predictable and traceable, not chased into an impossible zero. Every admin action on this platform writes to an audit log — what goes wrong feeds directly into what gets fixed next, the same discipline an incident produces a runbook.",
  },
  {
    name: "Permission Boundaries",
    body: "No AI acts autonomously on anything that matters. The one write path an automated agent can ever trigger here is the same inquiry form a human uses — never a more privileged shortcut.",
  },
];

export default function HowIBuildPage() {
  return (
    <article className="px-6 py-16 max-w-2xl mx-auto">
      <h1 className="font-sans font-semibold text-2xl text-ink mb-8">How I build</h1>

      <p className="font-serif text-lg text-ink leading-relaxed mb-12 max-w-prose">
        &ldquo;I build systems disciplined enough to be trusted with real money, real institutions, and real
        people&rsquo;s outcomes — engineered in South Africa, held to a global standard.&rdquo;
      </p>

      <div className="space-y-8 border-t border-slate/20 pt-8">
        {PRINCIPLES.map((principle) => (
          <div key={principle.name}>
            <h2 className="font-sans font-semibold text-ink mb-1.5">{principle.name}</h2>
            <p className="font-serif text-sm text-slate leading-relaxed max-w-prose">{principle.body}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-slate/20 pt-8 mt-8">
        <p className="font-mono text-xs text-slate mb-2">This platform enforces two of its own rules literally:</p>
        <ul className="space-y-2 font-sans text-sm text-ink">
          <li>
            <RuleCitation rule="BR-1.1" /> — a case study never publishes without the client&rsquo;s approval,
            checked server-side, every time.
          </li>
          <li>
            <RuleCitation rule="BR-4.1" /> — an automated agent gets no privileged write path beyond what a human
            visitor already has.
          </li>
        </ul>
      </div>
    </article>
  );
}
