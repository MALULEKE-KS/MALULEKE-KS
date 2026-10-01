// components/guide/GuideText.tsx
// Renders the guide's answer as React elements — never as HTML, so nothing a
// model (or a forged history) produces can inject markup. Supports what the
// guide writes: paragraphs, "- " bullets, **bold**, site paths
// ("/systems/xkimi-xa-mali") as links — the answer's sources — and https
// links only to an allow-list of hosts (GitHub and the owner's own profiles),
// opened in a new tab. Any other URL stays plain text.

import Link from "next/link";
import { Fragment } from "react";

// A site path: starts with "/", lowercase letters, digits, dashes, slashes. Never "//" (another host).
const PATH = /(?<![\w/.:])(\/[a-z0-9](?:[a-z0-9\-/]*[a-z0-9])?)(?=[\s).,;:!?]|$)/g;
// An https URL, without trailing punctuation.
const URL_RE = /(https:\/\/[a-z0-9.-]+(?:\/[^\s)<>"'`]*[^\s)<>"'`.,;:!?])?)/gi;
const BOLD = /\*\*([^*]+)\*\*/g;

const linkClass = "text-ember underline decoration-ember/40 underline-offset-2 hover:decoration-ember";

function hostAllowed(url: string, hosts: string[]) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return hosts.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function paths(text: string, key: string, onNavigate?: () => void) {
  return splitKeep(text, PATH).map(([t, path], j) =>
    path ? (
      <Link key={`${key}-p${j}`} href={path} onClick={onNavigate} className={linkClass}>
        {path}
      </Link>
    ) : (
      <Fragment key={`${key}-t${j}`}>{t}</Fragment>
    ),
  );
}

function inline(text: string, key: string, hosts: string[], onNavigate?: () => void) {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  // Bold first, then URLs, then site paths inside each plain run.
  for (const [chunk, bold] of splitKeep(text, BOLD)) {
    const rendered = splitKeep(bold ?? chunk, URL_RE).flatMap(([t, url], j) =>
      url
        ? hostAllowed(url, hosts)
          ? [
              <a key={`${key}-${i}-u${j}`} href={url} target="_blank" rel="noopener noreferrer nofollow" className={linkClass}>
                {url.replace(/^https:\/\/(www\.)?/, "")}
              </a>,
            ]
          : [<Fragment key={`${key}-${i}-x${j}`}>{url}</Fragment>]
        : paths(t, `${key}-${i}-${j}`, onNavigate),
    );
    nodes.push(bold ? <strong key={`${key}-b${i}`} className="text-paper font-semibold">{rendered}</strong> : <Fragment key={`${key}-f${i}`}>{rendered}</Fragment>);
    i++;
  }
  return nodes;
}

/** Split text by a global regex, returning [text, captured?] pairs in order. */
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

export function GuideText({ text, onNavigate, hosts = ["github.com"] }: { text: string; onNavigate?: () => void; hosts?: string[] }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2.5">
      {blocks.map((block, b) => {
        const lines = block.split("\n");
        const bullets = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        if (bullets) {
          return (
            <ul key={b} className="list-disc space-y-1 pl-5 marker:text-ember/70">
              {lines.map((l, i) => (
                <li key={i}>{inline(l.replace(/^\s*[-*•]\s+/, ""), `${b}-${i}`, hosts, onNavigate)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={b}>
            {lines.map((l, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {inline(l, `${b}-${i}`, hosts, onNavigate)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
