// app/(public)/how-i-build/page.tsx
// /how-i-build — mission statement, governing principles in plain language,
// real RuleCitation components (e.g. BR-1.1, BR-4.1). Admin-editable as a
// single content block, not a full CMS entity — this page is genuinely
// static content (docs/PAGE-SPECIFICATIONS.md's own explicit call), not a
// gap waiting on a database model.
// See docs/PAGE-SPECIFICATIONS.md ("/how-i-build"), docs/PLATFORM-CONSTITUTION-v1.md §1.

import { RuleCitation } from "@/components/shared/RuleCitation";
import { Container } from "@/components/shared/Container";
import { PRINCIPLES } from "@/lib/content/principles";

export const metadata = { title: "How I build" };

export default function HowIBuildPage() {
  return (
    <Container>
      <article className="max-w-2xl py-16">
        <h1 className="text-ink mb-8 font-sans text-2xl font-semibold">How I build</h1>

        <p className="text-ink mb-12 max-w-prose font-serif text-lg leading-relaxed">
          &ldquo;I build systems disciplined enough to be trusted with real money, real institutions, and real
          people&rsquo;s outcomes — engineered in South Africa, held to a global standard.&rdquo;
        </p>

        <div className="border-slate/20 space-y-8 border-t pt-8">
          {PRINCIPLES.map((principle) => (
            <div key={principle.name}>
              <h2 className="text-ink mb-1.5 font-sans font-semibold">{principle.name}</h2>
              <p className="text-slate max-w-prose font-serif text-sm leading-relaxed">{principle.body}</p>
            </div>
          ))}
        </div>

        <div className="border-slate/20 mt-8 border-t pt-8">
          <p className="text-slate mb-2 font-mono text-xs">This platform enforces two of its own rules literally:</p>
          <ul className="text-ink space-y-2 font-sans text-sm">
            <li>
              <RuleCitation rule="BR-1.1" /> — a case study never publishes without the client&rsquo;s approval, checked
              server-side, every time.
            </li>
            <li>
              <RuleCitation rule="BR-4.1" /> — an automated agent gets no privileged write path beyond what a human
              visitor already has.
            </li>
          </ul>
        </div>
      </article>
    </Container>
  );
}
