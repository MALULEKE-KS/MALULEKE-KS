// components/shared/SystemPreviewFrame.tsx
// 16:9 homepage preview for a System's case study. Falls back to a
// technical wireframe placeholder (not a broken image or empty box) when
// screenshotUrl is null — most systems won't have one filled in yet, and
// this platform never fakes content that isn't real (Design System ethos:
// make it exist first, make it beautiful after — an honest "not yet
// captured" placeholder beats a stretched or missing image).

interface SystemPreviewFrameProps {
  screenshotUrl: string | null;
  liveUrl: string | null;
  name: string;
}

export function SystemPreviewFrame({ screenshotUrl, liveUrl, name }: SystemPreviewFrameProps) {
  return (
    <div className="relative aspect-video w-full border border-slate/20 bg-[#E2E7ED] overflow-hidden">
      {screenshotUrl ? (
        // Plain <img>, not next/image: screenshotUrl is arbitrary
        // admin-supplied text (there's no file upload yet, see
        // Constitution §9), so there's no fixed host to whitelist in
        // next.config.ts's remotePatterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={screenshotUrl}
          alt={`${name} homepage preview`}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <div
          className="h-full w-full flex items-center justify-center p-6"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(61,74,92,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(61,74,92,0.08) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        >
          <div className="w-full max-w-[280px] border border-dashed border-slate/40 bg-paper/85 p-4 flex flex-col gap-2">
            <div className="flex justify-between font-mono text-[9px] text-slate">
              <span>PREVIEW</span>
              <span className="text-accent">[PENDING]</span>
            </div>
            <div className="h-1.5 w-full bg-slate/20" />
            <div className="h-1.5 w-full bg-slate/20" />
            <div className="h-1.5 w-3/5 bg-slate/20" />
          </div>
        </div>
      )}

      {/* Mono URL bar along the bottom — real live URL when we have one,
          otherwise names the state plainly rather than showing nothing. */}
      <div className="absolute bottom-0 inset-x-0 bg-paper/95 border-t border-slate/20 px-3 py-1.5 flex items-center gap-1.5 font-mono text-[11px] text-slate">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" className="shrink-0">
          <rect x="3" y="11" width="18" height="11" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="truncate text-ink">{liveUrl ?? "No live preview captured yet"}</span>
      </div>
    </div>
  );
}
