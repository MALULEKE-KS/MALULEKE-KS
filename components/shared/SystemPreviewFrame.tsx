// components/shared/SystemPreviewFrame.tsx
// 16:10 preview of a System. With a screenshot: the image, in a window
// frame. Without one (most systems, for now): a blueprint wireframe of a
// browser window stating plainly that no preview is captured yet — an
// honest drawing of what will go here, never a fake screenshot or a broken
// image (DESIGN-SYSTEM.md v2 §4.1).

interface SystemPreviewFrameProps {
  screenshotUrl: string | null;
  liveUrl: string | null;
  name: string;
}

export function SystemPreviewFrame({ screenshotUrl, liveUrl, name }: SystemPreviewFrameProps) {
  const host = liveUrl ? liveUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;

  return (
    <div className="border-blueprint bg-blueprint relative w-full overflow-hidden border">
      {/* Window chrome */}
      <div className="border-line/25 bg-blueprint-deep flex items-center gap-3 border-b px-3 py-2">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="border-line/60 size-2 border" />
          <span className="border-line/60 size-2 border" />
          <span className="bg-amber size-2" />
        </span>
        <span className="text-mist min-w-0 truncate font-mono text-xs">
          {host ?? `${name.toLowerCase()} / preview`}
        </span>
      </div>

      <div className="relative aspect-[16/10]">
        {screenshotUrl ? (
          // Plain <img>, not next/image: screenshotUrl is admin-supplied text
          // with no fixed host to whitelist in next.config.ts remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screenshotUrl}
            alt={`${name} homepage`}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        ) : (
          <div className="bp-grid absolute inset-0 flex items-center justify-center p-6">
            <svg viewBox="0 0 320 190" aria-hidden="true" className="text-line h-auto w-full max-w-[420px]" fill="none">
              {/* A wireframe page: nav, hero block, three columns */}
              <rect x="0.5" y="0.5" width="319" height="189" stroke="currentColor" strokeOpacity=".5" />
              <path d="M12 16 h40 M230 16 h22 M260 16 h22 M290 16 h18" stroke="currentColor" strokeOpacity=".6" />
              <path d="M0 30 H320" stroke="currentColor" strokeOpacity=".35" />
              <path d="M24 58 h150 M24 72 h110" stroke="currentColor" strokeWidth="6" strokeOpacity=".35" />
              <rect x="24" y="88" width="56" height="14" className="fill-amber" fillOpacity=".85" />
              <rect
                x="210"
                y="46"
                width="88"
                height="64"
                stroke="currentColor"
                strokeOpacity=".5"
                strokeDasharray="3 4"
              />
              <path d="M210 46 L298 110 M298 46 L210 110" stroke="currentColor" strokeOpacity=".25" />
              <path
                d="M24 130 h84 v44 h-84 z M118 130 h84 v44 h-84 z M212 130 h84 v44 h-84 z"
                stroke="currentColor"
                strokeOpacity=".4"
              />
            </svg>
            <p className="border-line/40 bg-blueprint-deep text-mist absolute bottom-3 left-3 border px-2 py-1 font-mono text-xs">
              Live preview not captured yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
