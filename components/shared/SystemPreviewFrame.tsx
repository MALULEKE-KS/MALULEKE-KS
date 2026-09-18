// components/shared/SystemPreviewFrame.tsx
// A System's preview in a browser-window frame. With a screenshot: the image.
// Without one (most systems, for now): an honest wireframe that says plainly
// no preview is captured yet — never a fake screenshot or a broken image
// (DESIGN-SYSTEM.md §4.1).

import { ImageOff } from "lucide-react";

interface SystemPreviewFrameProps {
  screenshotUrl: string | null;
  liveUrl: string | null;
  name: string;
}

export function SystemPreviewFrame({ screenshotUrl, liveUrl, name }: SystemPreviewFrameProps) {
  const host = liveUrl ? liveUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-ink/10 bg-night shadow-lift">
      {/* Window chrome */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-night-deep px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
        </span>
        <span className="min-w-0 flex-1 truncate rounded-md bg-white/5 px-3 py-1 text-center font-mono text-xs text-mist">
          {host ?? `${name.toLowerCase().replace(/\s+/g, "-")}.preview`}
        </span>
      </div>

      <div className="relative aspect-[16/10]">
        {screenshotUrl ? (
          // Plain <img>, not next/image: screenshotUrl is admin-supplied text
          // with no fixed host to whitelist in next.config.ts remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={screenshotUrl} alt={`${name} homepage`} className="absolute inset-0 h-full w-full object-cover object-top" />
        ) : (
          <div className="hero-field absolute inset-0 flex items-center justify-center p-6">
            <svg viewBox="0 0 320 190" aria-hidden="true" className="h-auto w-full max-w-[420px] text-white" fill="none">
              {/* A wireframe page: nav, hero block, three columns */}
              <rect x="0.5" y="0.5" width="319" height="189" rx="8" stroke="currentColor" strokeOpacity=".14" />
              <path d="M16 18 h36 M236 18 h20 M264 18 h20 M292 18 h14" stroke="currentColor" strokeOpacity=".25" strokeLinecap="round" strokeWidth="3" />
              <path d="M24 60 h150 M24 76 h110" stroke="currentColor" strokeWidth="7" strokeOpacity=".16" strokeLinecap="round" />
              <rect x="24" y="92" width="58" height="16" rx="8" fill="#FF5B1F" fillOpacity=".9" />
              <rect x="206" y="46" width="92" height="66" rx="8" fill="currentColor" fillOpacity=".05" stroke="currentColor" strokeOpacity=".16" />
              <path d="M24 132 h84 v42 h-84 z M118 132 h84 v42 h-84 z M212 132 h84 v42 h-84 z" fill="currentColor" fillOpacity=".04" stroke="currentColor" strokeOpacity=".12" />
            </svg>
            <p className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-night-deep/80 px-3 py-1 text-xs text-mist backdrop-blur">
              <ImageOff aria-hidden="true" className="size-3.5" />
              Live preview not captured yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
