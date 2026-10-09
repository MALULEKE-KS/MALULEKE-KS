// tests/unit/guide-tour-card.test.tsx
// The guided tour card and the spotlight (docs/AI-GUIDE-PHASE2-PLAN.md §7): the owner's
// stops, stepped through; the section lit for the owner's number of seconds, then let go.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ResolvedTour } from "@/lib/guide/tour";

const push = vi.fn();
const steps: Record<string, number> = {};
const setTourStep = vi.fn((id: string, n: number) => {
  steps[id] = n;
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/guide/GuideChatProvider", () => ({ useGuideChat: () => ({ tourStep: steps, setTourStep }) }));

import { TourCard } from "@/components/guide/console/TourCard";
import { spotlight } from "@/lib/guide/spotlight";

const TOUR: ResolvedTour = {
  key: "the-evidence",
  label: "The evidence, in three stops",
  summary: "Systems, skills, contact.",
  spotlightSeconds: 4,
  stops: [
    { href: "/systems", path: "/systems", anchor: null, say: "Every system, with its status." },
    { href: "/about#skills", path: "/about", anchor: "skills", say: "Each skill and what proves it." },
    { href: "/contact", path: "/contact", anchor: null, say: "Write here." },
  ],
};

beforeEach(() => {
  push.mockReset();
  setTourStep.mockClear();
  for (const k of Object.keys(steps)) delete steps[k];
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("TourCard", () => {
  it("starts with the owner's summary and a start button", () => {
    render(<TourCard id="t1" tour={TOUR} />);
    expect(screen.getByText("The evidence, in three stops")).toBeTruthy();
    expect(screen.getByText("Systems, skills, contact.")).toBeTruthy();
    expect(screen.queryByText("Back")).toBeNull();
  });

  it("opens each stop's page and says the owner's line there", () => {
    const { rerender } = render(<TourCard id="t1" tour={TOUR} />);
    fireEvent.click(screen.getByText("Start the tour"));
    expect(push).toHaveBeenLastCalledWith("/systems");
    expect(setTourStep).toHaveBeenLastCalledWith("t1", 0);
    rerender(<TourCard id="t1" tour={TOUR} />);
    expect(screen.getByText("Every system, with its status.")).toBeTruthy();
    fireEvent.click(screen.getByText("Next"));
    expect(push).toHaveBeenLastCalledWith("/about#skills");
    rerender(<TourCard id="t1" tour={TOUR} />);
    expect(screen.getByText("Each skill and what proves it.")).toBeTruthy();
    expect(screen.getByText("2 of 3")).toBeTruthy();
  });

  it("goes back, restarts, and can't go past the last stop", () => {
    steps.t1 = 2;
    const { rerender } = render(<TourCard id="t1" tour={TOUR} />);
    expect((screen.getByText("Next").closest("button") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText("Back"));
    expect(push).toHaveBeenLastCalledWith("/about#skills");
    rerender(<TourCard id="t1" tour={TOUR} />);
    fireEvent.click(screen.getByText("Restart"));
    expect(push).toHaveBeenLastCalledWith("/systems");
    expect(setTourStep).toHaveBeenLastCalledWith("t1", 0);
  });

  it("draws nothing for a tour with no stops left", () => {
    expect(render(<TourCard id="t2" tour={null} />).container.innerHTML).toBe("");
    expect(render(<TourCard id="t3" tour={{ ...TOUR, stops: [] }} />).container.innerHTML).toBe("");
  });
});

describe("spotlight", () => {
  it("scrolls to the section, lights it for the owner's seconds, then lets it go", () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<section id="skills">Skills</section>';
    spotlight("skills", 4);
    const el = document.getElementById("skills")!;
    expect(el.classList.contains("guide-spotlight")).toBe(true);
    expect(el.scrollIntoView).toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(3900));
    expect(el.classList.contains("guide-spotlight")).toBe(true);
    act(() => void vi.advanceTimersByTime(200));
    expect(el.classList.contains("guide-spotlight")).toBe(false);
  });

  it("waits briefly for a page that is still arriving, and gives up quietly if the section never appears", () => {
    vi.useFakeTimers();
    spotlight("skills", 2);
    document.body.innerHTML = '<section id="skills">Skills</section>';
    act(() => void vi.advanceTimersByTime(300));
    expect(document.getElementById("skills")!.classList.contains("guide-spotlight")).toBe(true);
    spotlight("never-there", 2);
    act(() => void vi.advanceTimersByTime(5000)); // no error, nothing lit
    expect(document.querySelectorAll(".guide-spotlight")).toHaveLength(0);
  });

  it("lights one thing at a time and ignores a section name that isn't an anchor", () => {
    document.body.innerHTML = '<section id="a">A</section><section id="b">B</section>';
    spotlight("a", 4);
    spotlight("b", 4);
    expect(document.querySelectorAll(".guide-spotlight")).toHaveLength(1);
    spotlight('x"><img src=x>', 4);
    expect(document.querySelectorAll(".guide-spotlight")).toHaveLength(0);
    spotlight(null, 4);
  });
});
