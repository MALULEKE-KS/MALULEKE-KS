// components/xray/XraySwitch.tsx
// "See how this page works" (D-067): a switch that X-rays the page. The overlay — its labels,
// its panel and the manifest they read — is downloaded the first time it's turned on, so the
// page carries none of it until a visitor asks.

"use client";

import { useCallback, useState, type ComponentType } from "react";
import { ScanEye } from "lucide-react";
import type { XrayCopy } from "@/lib/xray/copy";
import type { XrayOverlayProps } from "@/components/xray/XrayOverlay";
import { cn } from "@/lib/utils";

export function XraySwitch({
  copy,
  source,
}: {
  copy: XrayCopy;
  source: { repository: string; commit: string | null };
}) {
  const [on, setOn] = useState(false);
  const [Overlay, setOverlay] = useState<ComponentType<XrayOverlayProps> | null>(null);

  const toggle = useCallback(() => {
    if (on) return setOn(false);
    void import("@/components/xray/XrayOverlay").then((m) => {
      setOverlay(() => m.default);
      setOn(true);
    });
  }, [on]);

  // Warm the overlay when a visitor shows intent, so turning it on is instant.
  const warm = useCallback(() => void import("@/components/xray/XrayOverlay"), []);

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        onPointerEnter={warm}
        onFocus={warm}
        onTouchStart={warm}
        className={cn(
          "tap-target group inline-flex shrink-0 items-center gap-2.5 self-start rounded-full border py-1.5 pr-1.5 pl-3.5 text-[13px] font-medium transition-colors sm:self-auto",
          "focus-visible:outline-ember focus-visible:outline-2 focus-visible:outline-offset-2",
          on
            ? "border-ember/60 bg-ember/10 text-paper"
            : "text-paper/90 border-white/15 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.08]"
        )}
      >
        <ScanEye
          className={cn("size-4", on ? "text-ember" : "text-mist group-hover:text-paper")}
          aria-hidden="true"
        />
        {copy.switchLabel}
        {/* The track: a pill with a knob, so it reads as a switch at a glance. */}
        <span
          aria-hidden="true"
          className={cn(
            "relative h-5 w-9 rounded-full transition-colors",
            on ? "bg-ember" : "bg-white/15"
          )}
        >
          <span
            className={cn(
              "bg-paper absolute top-0.5 left-0.5 size-4 rounded-full shadow transition-transform duration-200 motion-reduce:transition-none",
              on && "translate-x-4"
            )}
          />
        </span>
      </button>
      {on && Overlay && <Overlay copy={copy} source={source} onClose={() => setOn(false)} />}
    </>
  );
}
