// components/guide/GuideText.tsx
// Renders the guide's answer as React elements — never as HTML, so nothing a
// model (or a forged history) produces can inject markup. A small, safe
// subset of Markdown, exactly what the guide is told it may write:
//   paragraphs; "- " bullets and "1. " steps (a lead-in line may sit above a
//   list); **bold**; `inline code`; fenced code blocks (with a copy button —
//   an unclosed fence while streaming is shown as code so far); "#"-headings
//   shown as bold lines; [label](target) links.
// Links: site paths ("/systems/xkimi-xa-mali", "/about#method") — the
// answer's sources — and https links only to an allow-list of hosts (GitHub
// and the owner's own profiles), opened in a new tab. Anything else stays
// plain text; a [label](target) to a refused target shows just its label.

import Link from "next/link";
import { Fragment } from "react";
import { CopyButton } from "@/components/guide/CopyButton";

// A site path: starts with "/", lowercase letters, digits, dashes, slashes, an optional #anchor. Never "//" (another host).
const PATH_SRC = String.raw`\/[a-z0-9](?:[a-z0-9\-/]*[a-z0-9])?(?:#[a-z0-9][a-z0-9-]*)?`;
const PATH = new RegExp(String.raw`(?<![\w/.:])(${PATH_SRC})(?=[\s).,;:!?]|$)`, "g");
const IS_PATH = new RegExp(`^${PATH_SRC}$`);
// An https URL, without trailing punctuation.
const URL_RE = /(https:\/\/[a-z0-9.-]+(?:\/[^\s)<>"'`]*[^\s)<>"'`.,;:!?])?)/gi;
// [label](target) — label without brackets, target without spaces or parentheses.
const MD_LINK = /\[([^\]\n]{1,120})\]\(([^)\s]{1,300})\)/g;
const BOLD = /\*\*([^*]+)\*\*/g;
const CODE = /`([^`\n]+)`/g;
const FENCE = /```([a-z0-9+#.-]*)[^\S\n]*\n([\s\S]*?)(?:```|$)/gi;

const linkClass = "text-ember underline decoration-ember/40 underline-offset-2 hover:decoration-ember";
const BULLET = /^\s*[-*•]\s+/;
const STEP = /^\s*\d{1,2}[.)]\s+/;
const HEADING = /^\s*#{1,6}\s+/;

function hostAllowed(url: string, hosts: string[]) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return hosts.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

interface Ctx {
  hosts: string[];
  onNavigate?: () => void;
}

function siteLink(path: string, label: React.ReactNode, key: string, ctx: Ctx) {
  return (
    <Link key={key} href={path} onClick={ctx.onNavigate} className={linkClass}>
      {label}
    </Link>
  );
}

function outLink(url: string, label: React.ReactNode, key: string) {
  return (
    <a key={key} href={url} target="_blank" rel="noopener noreferrer nofollow" className={linkClass}>
      {label}
    </a>
  );
}

/** Plain text → URLs on the allow-list and site paths become links. */
function autolink(text: string, key: string, ctx: Ctx): React.ReactNode[] {
  return splitKeep(text, URL_RE).flatMap(([t, url], j) =>
    url
      ? [hostAllowed(url, ctx.hosts) ? outLink(url, url.replace(/^https:\/\/(www\.)?/, ""), `${key}-u${j}`) : <Fragment key={`${key}-x${j}`}>{url}</Fragment>]
      : splitKeep(t, PATH).map(([s, path], k) => (path ? siteLink(path, path, `${key}-p${j}-${k}`, ctx) : <Fragment key={`${key}-t${j}-${k}`}>{s}</Fragment>)),
  );
}

/** One line of prose: code spans, then [label](target) links, then bold, then autolinks. */
function inline(text: string, key: string, ctx: Ctx): React.ReactNode[] {
  return splitKeep(text, CODE).flatMap(([chunk, code], i) => {
    if (code !== null) {
      return [
        <code key={`${key}-c${i}`} className="rounded-md bg-white/10 px-1 py-px font-mono text-[0.9em] text-paper">
          {code}
        </code>,
      ];
    }
    return splitLinks(chunk).flatMap(([t, label, target], j) => {
      const k = `${key}-${i}-${j}`;
      if (label !== null && target !== null) {
        if (IS_PATH.test(target)) return [siteLink(target, label, k, ctx)];
        if (hostAllowed(target, ctx.hosts)) return [outLink(target, label, k)];
        return [<Fragment key={k}>{label}</Fragment>];
      }
      return splitKeep(t, BOLD).map(([s, bold], b) =>
        bold !== null ? (
          <strong key={`${k}-b${b}`} className="text-paper font-semibold">
            {autolink(bold, `${k}-b${b}`, ctx)}
          </strong>
        ) : (
          <Fragment key={`${k}-f${b}`}>{autolink(s, `${k}-f${b}`, ctx)}</Fragment>
        ),
      );
    });
  });
}

/** Split text by a global regex, returning [text, captured | null] pairs in order. */
function splitKeep(text: string, re: RegExp): [string, string | null][] {
  const out: [string, string | null][] = [];
  let last = 0;
  for (const m of text.matchAll(new RegExp(re.source, re.flags))) {
    if (m.index! > last) out.push([text.slice(last, m.index), null]);
    out.push([m[0], m[1] ?? m[0]]);
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push([text.slice(last), null]);
  return out;
}

/** [text, label | null, target | null] runs for Markdown links. */
function splitLinks(text: string): [string, string | null, string | null][] {
  const out: [string, string | null, string | null][] = [];
  let last = 0;
  for (const m of text.matchAll(MD_LINK)) {
    if (m.index! > last) out.push([text.slice(last, m.index), null, null]);
    out.push([m[0], m[1]!, m[2]!]);
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push([text.slice(last), null, null]);
  return out;
}

/** A prose block: runs of bullets or steps become lists; other lines stay lines. */
function Prose({ block, k, ctx }: { block: string; k: string; ctx: Ctx }) {
  const lines = block.split("\n").filter((l) => l.trim() !== "");
  const groups: { kind: "p" | "ul" | "ol"; lines: string[] }[] = [];
  for (const line of lines) {
    const kind = BULLET.test(line) ? "ul" : STEP.test(line) ? "ol" : "p";
    const prev = groups[groups.length - 1];
    if (prev && prev.kind === kind) prev.lines.push(line);
    else groups.push({ kind, lines: [line] });
  }
  return (
    <>
      {groups.map((g, gi) => {
        const key = `${k}-${gi}`;
        if (g.kind === "ul" || g.kind === "ol") {
          const Tag = g.kind;
          return (
            <Tag key={key} className={g.kind === "ul" ? "list-disc space-y-1 pl-5 marker:text-ember/70" : "list-decimal space-y-1 pl-5 marker:text-ember/80 marker:font-mono marker:text-xs"}>
              {g.lines.map((l, i) => (
                <li key={i}>{inline(l.replace(g.kind === "ul" ? BULLET : STEP, ""), `${key}-${i}`, ctx)}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={key}>
            {g.lines.map((l, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {HEADING.test(l) ? <strong className="text-paper font-semibold">{inline(l.replace(HEADING, ""), `${key}-${i}`, ctx)}</strong> : inline(l, `${key}-${i}`, ctx)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

export function GuideText({ text, onNavigate, hosts = ["github.com"] }: { text: string; onNavigate?: () => void; hosts?: string[] }) {
  const ctx: Ctx = { hosts, onNavigate };
  // Code fences first — their contents are shown exactly, never parsed.
  const parts: { code: boolean; lang?: string; body: string }[] = [];
  let last = 0;
  const source = text.trim();
  for (const m of source.matchAll(FENCE)) {
    if (m.index! > last) parts.push({ code: false, body: source.slice(last, m.index) });
    parts.push({ code: true, lang: m[1] || undefined, body: (m[2] ?? "").replace(/\n$/, "") });
    last = m.index! + m[0].length;
  }
  if (last < source.length) parts.push({ code: false, body: source.slice(last) });

  return (
    <div className="space-y-2.5">
      {parts.map((part, i) =>
        part.code ? (
          <div key={i} className="group/code relative overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-1">
              <span className="text-mist font-mono text-[10px] tracking-wide uppercase">{part.lang ?? "code"}</span>
              <CopyButton text={part.body} />
            </div>
            <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[12px] leading-relaxed">
              <code>{part.body}</code>
            </pre>
          </div>
        ) : (
          part.body
            .split(/\n{2,}/)
            .filter((b) => b.trim())
            .map((block, b) => <Prose key={`${i}-${b}`} block={block} k={`${i}-${b}`} ctx={ctx} />)
        ),
      )}
    </div>
  );
}
