// components/shared/Prose.tsx
// Long-form Markdown — a case study body (#99) — in the design system's
// reading type: IBM Plex Serif at full prose width, sans headings, mono code.
// Safe by construction: react-markdown never renders raw HTML, so an
// admin-entered body can't inject markup or scripts. Links leaving the site
// open in a new tab with no opener.
//
// Phone-safe by design, whatever a body contains (written or generated): code
// blocks and tables scroll inside their own box, long words, links and inline
// code wrap instead of widening the page, images never exceed the column.

import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** A heading's anchor: "How it works" → "how-it-works". */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The body's section headings (## lines), for an "On this page" index. */
export function markdownSections(markdown: string): { id: string; title: string }[] {
  return markdown
    .split("\n")
    .filter((l) => /^##\s+\S/.test(l))
    .map((l) => l.replace(/^##\s+/, "").replace(/[*_`]/g, "").trim())
    .map((title) => ({ id: headingSlug(title), title }));
}

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : isValidElement<{ children?: ReactNode }>(c) ? textOf(c.props.children) : ""))
    .join("");
}

const components: Components = {
  h1: ({ children }) => (
    <h2 className="text-ink mt-12 font-sans text-3xl font-semibold tracking-tight">{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 id={headingSlug(textOf(children))} className="text-ink mt-12 scroll-mt-28 font-sans text-2xl font-semibold tracking-tight first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-ink mt-10 font-sans text-xl font-semibold">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-ink mt-8 font-sans text-lg font-semibold">{children}</h4>
  ),
  p: ({ children }) => <p className="mt-6 leading-[1.8]">{children}</p>,
  ul: ({ children }) => (
    <ul className="marker:text-accent mt-6 list-disc space-y-2 pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="marker:text-slate mt-6 list-decimal space-y-2 pl-6 marker:font-mono">
      {children}
    </ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-ember text-slate mt-6 border-l-2 pl-5 italic">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-ink/[0.06] text-ink rounded-md px-1.5 py-0.5 font-mono text-[0.9em] [overflow-wrap:anywhere]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-night text-paper [&_code]:text-paper mt-6 max-w-full overflow-x-auto rounded-2xl p-4 font-mono text-[13px] leading-relaxed sm:p-5 sm:text-sm [&_code]:bg-transparent [&_code]:p-0 [&_code]:[overflow-wrap:normal]">
      {children}
    </pre>
  ),
  a: ({ href, children }) => {
    const external = typeof href === "string" && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="text-accent decoration-accent/40 hover:decoration-accent font-medium underline underline-offset-4 transition-colors [overflow-wrap:anywhere]"
      >
        {children}
      </a>
    );
  },
  hr: () => <hr className="border-ink/10 my-10" />,
  table: ({ children }) => (
    <div className="mt-6 max-w-full overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse font-sans text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-ink/15 text-ink border-b px-3 py-2 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="border-ink/10 text-slate border-b px-3 py-2 align-top">{children}</td>,
  // Images in a body are admin-supplied URLs with no fixed host to allow-list
  // for next/image (next.config remotePatterns); shown plainly, lazily loaded.
  img: ({ src, alt }) =>
    typeof src === "string" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        className="border-ink/10 mt-6 h-auto max-w-full rounded-2xl border"
        loading="lazy"
      />
    ) : null,
};

export function Prose({ markdown }: { markdown: string }) {
  return (
    <div className="text-ink max-w-prose min-w-0 font-serif text-[1.0625rem] break-words sm:text-lg [&>*:first-child]:mt-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
