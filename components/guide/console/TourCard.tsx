// components/guide/console/TourCard.tsx
// A guided tour (docs/AI-GUIDE-PHASE2-PLAN.md §7): the owner's stops, one at a time.
// Next opens the stop's page, lights up its section and shows the owner's line for it;
// Back and Restart walk it again. Where the visitor is in the tour is kept in the chat
// (so it survives the console moving from the home page to the docked panel). Nothing
// here is the model's: the stops and every word come from the "guide-tours" block.

"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Footprints, RotateCcw } from "lucide-react";
import { useGuideChat } from "@/components/guide/GuideChatProvider";
import { spotlight } from "@/lib/guide/spotlight";
import { stepTo } from "@/lib/guide/tour-step";
import type { ResolvedTour } from "@/lib/guide/tour";
import { cn } from "@/lib/utils";

const button =
  "text-mist hover:text-paper hover:border-ember/40 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[12px] transition-colors disabled:pointer-events-none disabled:opacity-40";

export function TourCard({ id, tour, onNavigate }: { id: string; tour: ResolvedTour | null; onNavigate?: () => void }) {
  const router = useRouter();
  const { tourStep, setTourStep } = useGuideChat();
  if (!tour || tour.stops.length === 0) return null;

  // -1 = not started yet
  const at = tourStep[id] ?? -1;
  const stop = at >= 0 ? tour.stops[at] : null;

  function go(direction: "next" | "back" | "restart") {
    const next = at < 0 && direction === "next" ? 0 : stepTo(at, direction, tour!.stops.length);
    const target = tour!.stops[next]!;
    setTourStep(id, next);
    router.push(target.href);
    onNavigate?.();
    spotlight(target.anchor, tour!.spotlightSeconds);
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
      <span className="text-mist inline-flex items-center gap-1.5 text-[11px]">
        <Footprints aria-hidden="true" className="text-ember size-3.5" /> Guided tour · {tour.stops.length} {tour.stops.length === 1 ? "stop" : "stops"}
      </span>
      <span className="text-paper text-[14px] leading-snug font-semibold">{tour.label}</span>
      <span className="text-mist text-[12.5px] leading-relaxed">{stop ? stop.say : tour.summary}</span>
      <ol className="flex items-center gap-1.5" aria-label="Stops">
        {tour.stops.map((s, i) => (
          <li key={`${s.href}-${i}`}>
            <span
              className={cn("block h-1.5 rounded-full transition-all", i === at ? "bg-ember w-6" : i < at ? "w-3 bg-white/40" : "w-3 bg-white/15")}
              aria-current={i === at ? "step" : undefined}
              title={s.path}
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        {at >= 0 && (
          <button type="button" className={button} onClick={() => go("back")} disabled={at === 0}>
            <ArrowLeft aria-hidden="true" className="size-3.5" /> Back
          </button>
        )}
        <button type="button" className={cn(button, "text-paper border-ember/40")} onClick={() => go("next")} disabled={at === tour.stops.length - 1}>
          {at < 0 ? "Start the tour" : "Next"} <ArrowRight aria-hidden="true" className="size-3.5" />
        </button>
        {at >= 0 && (
          <button type="button" className={button} onClick={() => go("restart")}>
            <RotateCcw aria-hidden="true" className="size-3.5" /> Restart
          </button>
        )}
        {stop && (
          <span className="text-line ml-auto text-[11px]">
            {at + 1} of {tour.stops.length}
          </span>
        )}
      </div>
    </div>
  );
}
